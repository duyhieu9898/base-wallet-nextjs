import { refreshSession } from "@/features/auth/api/auth-api"
import type { AuthError } from "@/features/auth/domain/auth-error"
import { toRefreshAuthError } from "@/features/auth/domain/auth-error"
import type { AuthenticatedSessionPayload } from "@/features/auth/domain/auth.schemas"
import {
  toAccessTokenSnapshot,
  type AccessTokenStore,
} from "./access-token-store"
import type { AuthGeneration } from "./auth-generation"

/**
 * The result of a refresh.
 *
 * `unauthenticated` and `unavailable` are two different conclusions: the first is equal
 * terminal certificate from the backend, the latter just means unknown. Combine them together
 * Log out the user every time the network is unstable.
 *
 * `stale: true` means refresh completes after generation has changed (logout
 * or new login) — the result is not committed.
 */
export type RefreshResult =
  | {
      outcome: "authenticated"
      payload: AuthenticatedSessionPayload
      stale: boolean
    }
  | { outcome: "unauthenticated"; error: AuthError; stale: boolean }
  | { outcome: "unavailable"; error: AuthError; stale: boolean }

export type RefreshCoordinator = {
  /**
   * Run refresh, gathering all callers simultaneously into exactly one request.
   */
  refresh(): Promise<RefreshResult>
  /** True when there is an in-flight refresh. Used for testing and diagnostics. */
  isRefreshing(): boolean
}

export type CreateRefreshCoordinatorInput = {
  tokenStore: AccessTokenStore
  authGeneration: AuthGeneration
  /** Injectable for test; default is real API. */
  requestRefresh?: () => Promise<AuthenticatedSessionPayload>
}

export function createRefreshCoordinator({
  tokenStore,
  authGeneration,
  requestRefresh = () => refreshSession(),
}: CreateRefreshCoordinatorInput): RefreshCoordinator {
  let inFlight: Promise<RefreshResult> | null = null

  async function runRefresh(): Promise<RefreshResult> {
    // Capture generation BEFORE request. All waiters share this generation: them
    // were waiting for the same request, so they came to the same conclusion.
    const generation = authGeneration.current()

    try {
      const payload = await requestRefresh()

      if (!authGeneration.isCurrent(generation)) {
        // Logout or a new login has occurred while waiting. Do not write tokens,
        // Do not restore old sessions.
        return { outcome: "authenticated", payload, stale: true }
      }

      tokenStore.set(toAccessTokenSnapshot(payload))

      return { outcome: "authenticated", payload, stale: false }
    } catch (cause) {
      const error = toRefreshAuthError(cause)
      const stale = !authGeneration.isCurrent(generation)

      // `REFRESH_REJECTED` is terminal evidence: backend says no refresh
      // valid session. All remaining errors (network, 5xx, payload wrong contract)
      // just means it hasn't been determined yet.
      if (error.code === "REFRESH_REJECTED") {
        if (!stale) {
          tokenStore.clear()
        }

        return { outcome: "unauthenticated", error, stale }
      }

      return { outcome: "unavailable", error, stale }
    }
  }

  return {
    refresh() {
      if (inFlight !== null) {
        return inFlight
      }

      // Reset in `finally` so that a failure does not permanently lock out the coordinator:
      // The following request must still be refreshed.
      inFlight = runRefresh().finally(() => {
        inFlight = null
      })

      return inFlight
    },

    isRefreshing() {
      return inFlight !== null
    },
  }
}
