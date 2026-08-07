import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  adminLogin,
  adminLogout,
  adminRefreshSession,
  adminVerify2FA,
} from "../api/admin-auth-api"
import type { AdminLoginInput } from "../domain/admin-auth.schemas"
import {
  AdminAuthContext,
  type AdminAuthContextValue,
  type AdminAuthState,
} from "./admin-auth-context"
import {
  createAdminAccessTokenStore,
  toAdminAccessTokenSnapshot,
} from "./admin-access-token-store"

type AdminAuthProviderProps = {
  children: ReactNode
}

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  const [tokenStore] = useState(() => createAdminAccessTokenStore())
  const [state, setState] = useState<AdminAuthState>({
    status: "bootstrapping",
  })
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Bootstrap session rehydration from HttpOnly refresh cookie
  useEffect(() => {
    let active = true

    adminRefreshSession()
      .then((res) => {
        if (!active) return

        tokenStore.set(toAdminAccessTokenSnapshot(res))
        setState({
          status: "authenticated",
          admin: res.admin,
          expiresIn: res.expiresIn,
        })
      })
      .catch(() => {
        if (!active) return

        tokenStore.clear()
        setState({ status: "unauthenticated" })
      })

    return () => {
      active = false
    }
  }, [tokenStore])

  const login = useCallback(
    async (input: AdminLoginInput) => {
      setIsPending(true)
      setError(null)

      try {
        const response = await adminLogin(input)

        if ("twoFactorRequired" in response) {
          setState({
            status: "2fa_required",
            twoFactorToken: response.twoFactorToken,
          })

          return
        }

        tokenStore.set(toAdminAccessTokenSnapshot(response))
        setState({
          status: "authenticated",
          admin: response.admin,
          expiresIn: response.expiresIn,
        })
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Login failed")
        setState({ status: "unauthenticated" })
      } finally {
        setIsPending(false)
      }
    },
    [tokenStore],
  )

  const verify2FA = useCallback(
    async (code: string) => {
      if (state.status !== "2fa_required") return

      setIsPending(true)
      setError(null)

      try {
        const response = await adminVerify2FA({
          code,
          twoFactorToken: state.twoFactorToken,
        })

        tokenStore.set(toAdminAccessTokenSnapshot(response))
        setState({
          status: "authenticated",
          admin: response.admin,
          expiresIn: response.expiresIn,
        })
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "2FA verification failed")
      } finally {
        setIsPending(false)
      }
    },
    [state, tokenStore],
  )

  const logout = useCallback(async () => {
    setIsPending(true)

    try {
      const currentToken = tokenStore.get()?.token
      await adminLogout(currentToken)
    } catch {
      // Ignore network errors on logout
    } finally {
      tokenStore.clear()
      setState({ status: "unauthenticated" })
      setIsPending(false)
    }
  }, [tokenStore])

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      state,
      login,
      verify2FA,
      logout,
      isPending,
      error,
    }),
    [state, login, verify2FA, logout, isPending, error],
  )

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  )
}
