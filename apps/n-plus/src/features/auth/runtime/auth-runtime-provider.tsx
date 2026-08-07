import { useQueryClient, type QueryClient } from "@tanstack/react-query"
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { Address } from "viem"

import { queryKeys } from "@/lib/query/query-keys"
import { logout as logoutRequest } from "@/features/auth/api/auth-api"
import {
  toLogoutAuthError,
  type AuthError,
} from "@/features/auth/domain/auth-error"
import {
  authReducer,
  initialAuthState,
} from "@/features/auth/domain/auth-state"
import type { SiweVerifyAuthenticated } from "@/features/auth/domain/auth.schemas"
import {
  createAccessTokenStore,
  toAccessTokenSnapshot,
} from "./access-token-store"
import { createAuthGeneration } from "./auth-generation"
import {
  AuthRuntimeContext,
  type AuthRuntimeContextValue,
} from "./auth-runtime-context"
import { createAuthenticatedApiClient } from "./authenticated-api-client"
import { createRefreshCoordinator } from "./refresh-coordinator"
import { useSingleFlight } from "@/hooks/use-single-flight"

export type SessionClearedHandler = (input: {
  queryClient: QueryClient
}) => void

export type AuthRuntimeProviderProps = {
  children: ReactNode
  /**
   * Application composition determines what data is deleted when the session ends.
   * The default is user-scoped query cache.
   */
  onSessionCleared?: SessionClearedHandler
}

/**
 * Own the entire auth runtime for a provider tree.
 *
 * All services (token store, operation owner, refresh coordinator, API client)
 * created using lazy state — one instance per tree. No singleton modules:
 * On the server, a singleton will share tokens between requests.
 *
 * Provider must be in `QueryProvider` (to clear cache) and in `EvmProvider`
 * (so that login's wallet hook works).
 */
export function AuthRuntimeProvider({
  children,
  onSessionCleared,
}: AuthRuntimeProviderProps) {
  const queryClient = useQueryClient()

  const [services] = useState(() => {
    const tokenStore = createAccessTokenStore()
    const authGeneration = createAuthGeneration()
    const refreshCoordinator = createRefreshCoordinator({
      tokenStore,
      authGeneration,
    })

    return {
      tokenStore,
      authGeneration,
      refreshCoordinator,
      apiClient: createAuthenticatedApiClient({
        tokenStore,
        refreshCoordinator,
      }),
    }
  })

  const [state, dispatch] = useReducer(authReducer, initialAuthState)

  const logoutFlight = useSingleFlight()
  const [logoutError, setLogoutError] = useState<AuthError | null>(null)

  // The callback is kept in the ref so you don't have to rebuild the entire context value every time
  // application passes a new closure. Record in effects for pure rendering.
  const sessionClearedRef = useRef(onSessionCleared)

  useEffect(() => {
    sessionClearedRef.current = onSessionCleared
  }, [onSessionCleared])

  const clearSessionState = useCallback(() => {
    const handler = sessionClearedRef.current

    if (handler) {
      handler({ queryClient })

      return
    }

    // Default: deletes the correct root of data associated with the backend identity. Auth no
    // List the name of each business feature — which feature has session data
    // then manually place the key under this root (see `query-keys.ts`).
    //
    // Cancel before removing: a request in flight can resolve after cache
    // has been deleted and the old user's data is recorded.
    //
    // Intentionally do not touch Wagmi cache, EVM selection, registry, on-chain data
    // public or local transaction history — log out of the application
    // means disconnect the wallet.
    const userScoped = { queryKey: queryKeys.userScoped.all }

    void queryClient.cancelQueries(userScoped)
    queryClient.removeQueries(userScoped)
  }, [queryClient])

  const runBootstrap = useCallback(async () => {
    const { refreshCoordinator, authGeneration, tokenStore } = services
    const generation = authGeneration.current()
    const result = await refreshCoordinator.refresh()

    if (!authGeneration.isCurrent(generation) || result.stale) {
      return
    }

    if (result.outcome === "authenticated") {
      dispatch({
        type: "session-established",
        user: result.payload.user,
        position: result.payload.position,
        expiresIn: result.payload.expiresIn,
      })

      return
    }

    if (result.outcome === "unauthenticated") {
      // Backend clearly says there is no session. The token has been cleared by the coordinator.
      dispatch({ type: "session-rejected" })
      clearSessionState()

      return
    }

    // Backend is unresponsive. This is NOT proof that the user has logged out
    // — state is `unavailable`, not `unauthenticated`, and user-scoped
    // cache is kept intact so that retry can recover the session.
    //
    // The token is omitted: bootstrap only runs when there is no valid session, so no
    // Is there any token worth keeping, and an unverifiable token should not be sent
    // comes with the next request.
    tokenStore.clear()
    dispatch({ type: "session-unverifiable", error: result.error })
  }, [clearSessionState, services])

  const bootstrapStartedRef = useRef(false)

  useEffect(() => {
    if (bootstrapStartedRef.current) {
      return
    }

    // Strict Mode mount provider twice. Ref blocks the second time, and even if
    // If it passes, the coordinator's single-flight will still be combined into one request.
    bootstrapStartedRef.current = true

    void runBootstrap()
  }, [runBootstrap])

  const retryBootstrap = useCallback(async () => {
    dispatch({ type: "bootstrap-started" })

    await runBootstrap()
  }, [runBootstrap])

  const isOperationCurrent = useCallback(
    (generation: number) => services.authGeneration.isCurrent(generation),
    [services],
  )

  const beginLogin = useCallback(
    (walletAddress: Address) => {
      const generation = services.authGeneration.next()

      dispatch({ type: "login-started", walletAddress })

      return generation
    },
    [services],
  )

  const commitLogin = useCallback(
    (payload: SiweVerifyAuthenticated, generation: number) => {
      if (!services.authGeneration.isCurrent(generation)) {
        return
      }

      services.tokenStore.set(toAccessTokenSnapshot(payload))

      dispatch({
        type: "session-established",
        user: payload.user,
        // The verify schema lets `position` be absent as well as null; the auth
        // state models "no position" as null only.
        position: payload.position ?? null,
        expiresIn: payload.expiresIn,
      })
    },
    [services],
  )

  const abortLogin = useCallback(
    (generation: number) => {
      if (!services.authGeneration.isCurrent(generation)) {
        return
      }

      // A failed login returns the state to unauthenticated — not `unavailable`:
      // The application is still active, it's just that the user is not logged in.
      dispatch({ type: "login-failed" })
    },
    [services],
  )

  const logout = useCallback(async () => {
    await logoutFlight.run(async () => {
      const { authGeneration, tokenStore } = services

      // Increase generation IMMEDIATELY when logout begins: an in-flight refresh fails
      // Allows session recovery after the user has requested to log out.
      const generation = authGeneration.next()

      setLogoutError(null)

      try {
        // The token remains for the backend to identify the session that needs revoke.
        await logoutRequest({ accessToken: tokenStore.get()?.token })
      } catch (cause) {
        // Network/5xx did not logout successfully. Keep the session intact and give
        // retry instead of lying that the server has revoke.
        setLogoutError(toLogoutAuthError(cause))

        return
      }

      if (!authGeneration.isCurrent(generation)) {
        return
      }

      tokenStore.clear()
      dispatch({ type: "logged-out" })
      clearSessionState()
    })
  }, [clearSessionState, logoutFlight, services])

  const value = useMemo<AuthRuntimeContextValue>(
    () => ({
      state,
      apiClient: services.apiClient,
      isOperationCurrent,
      beginLogin,
      commitLogin,
      abortLogin,
      logout,
      isLoggingOut: logoutFlight.isPending,
      logoutError,
      retryBootstrap,
    }),
    [
      abortLogin,
      beginLogin,
      commitLogin,
      isOperationCurrent,
      logout,
      logoutError,
      logoutFlight.isPending,
      retryBootstrap,
      services,
      state,
    ],
  )

  return (
    <AuthRuntimeContext.Provider value={value}>
      {children}
    </AuthRuntimeContext.Provider>
  )
}
