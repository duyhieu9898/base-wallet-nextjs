"use client"

import type { AuthError } from "@/features/auth/domain/auth-error"
import {
  isAuthResolving,
  type AuthState,
} from "@/features/auth/domain/auth-state"
import { useAuthRuntime } from "@/features/auth/runtime/auth-runtime-context"
import type { AuthenticatedApiClient } from "@/features/auth/runtime/authenticated-api-client"

export type UseAuthResult = {
  state: AuthState
  isAuthenticated: boolean
  /** Bootstrap or logging in — no conclusion about session yet. */
  isResolving: boolean
  apiClient: AuthenticatedApiClient
  logout(): Promise<void>
  isLoggingOut: boolean
  logoutError: AuthError | null
  retryBootstrap(): Promise<void>
}

/**
 * Public API of auth for application code.
 *
 * Intentionally do not expose access token, token store or operation owner: everything
 * All necessary tokens go through `apiClient`.
 */
export function useAuth(): UseAuthResult {
  const runtime = useAuthRuntime()

  return {
    state: runtime.state,
    isAuthenticated: runtime.state.status === "authenticated",
    isResolving: isAuthResolving(runtime.state),
    apiClient: runtime.apiClient,
    logout: runtime.logout,
    isLoggingOut: runtime.isLoggingOut,
    logoutError: runtime.logoutError,
    retryBootstrap: runtime.retryBootstrap,
  }
}
