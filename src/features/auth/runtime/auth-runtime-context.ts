"use client"

import { createContext, useContext } from "react"
import type { Address } from "viem"

import type { AuthError } from "@/features/auth/domain/auth-error"
import type { AuthState } from "@/features/auth/domain/auth-state"
import type { AuthenticatedSessionPayload } from "@/features/auth/domain/auth.schemas"
import type { AuthenticatedApiClient } from "./authenticated-api-client"

/**
 * Context value of auth runtime.
 *
 * The access token is NOT present here and no action returns it. Tokens
 * just goes from private store to `apiClient` — no component can read it.
 *
 * Login orchestration is in `useSiweLogin()` and not in the context:
 * it needs Wagmi's wallet hooks, which the provider must be able to mount even when EVM is turned off.
 * Context therefore only exposes the pieces that login needs to commit the result.
 */
export type AuthRuntimeContextValue = {
  state: AuthState

  /** Client for protected endpoints. Automatically attach tokens and handle refreshes. */
  apiClient: AuthenticatedApiClient

  /**
   * Is the caller's generation still the current generation?
   *
   * Context exposes this question instead of the counter: the consumer just needs to know
   * "will my results still be committed", regardless of the underlying mechanism.
   */
  isOperationCurrent(generation: number): boolean

  /**
   * Start a login attempt: increase generation and switch to `authenticating`.
   * Returns the generation that the caller must capture for the entire operation.
   */
  beginLogin(walletAddress: Address): number

  /** Commit verification results. Ignored if generation is stale. */
  commitLogin(payload: AuthenticatedSessionPayload, generation: number): void

  /** Ends a failed login attempt. Ignored if generation is stale. */
  abortLogin(generation: number): void

  logout(): Promise<void>
  isLoggingOut: boolean
  logoutError: AuthError | null

  retryBootstrap(): Promise<void>
}

export const AuthRuntimeContext = createContext<AuthRuntimeContextValue | null>(
  null,
)

export function useAuthRuntime(): AuthRuntimeContextValue {
  const value = useContext(AuthRuntimeContext)

  if (value === null) {
    throw new Error(
      "useAuthRuntime must be used within <AuthRuntimeProvider>. Check the provider composition in src/app/providers.tsx.",
    )
  }

  return value
}
