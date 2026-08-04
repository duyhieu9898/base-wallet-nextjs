import { apiRequest } from "@/lib/api/api-client"
import type { ApiRequestOptions } from "@/lib/api/types"
import { isAuthProtocolEndpoint } from "@/features/auth/api/auth-api"
import { isRefreshableAuthError } from "@/features/auth/domain/auth-error"
import type { AccessTokenStore } from "./access-token-store"
import type { RefreshCoordinator } from "./refresh-coordinator"

/**
 * `safe` allows replaying exactly once after refreshing. Only used when endpoint contracts
 * prove idempotent — replaying a non-idempotent mutation can create two
 * records, two deductions, or two transactions.
 */
export type AuthRetryPolicy = "safe" | "never"

export type AuthenticatedApiRequestOptions = ApiRequestOptions & {
  authRetry?: AuthRetryPolicy
  idempotencyKey?: string
}

export type AuthenticatedApiClient = {
  request<T>(path: string, options?: AuthenticatedApiRequestOptions): Promise<T>
}

export type CreateAuthenticatedApiClientInput = {
  tokenStore: AccessTokenStore
  refreshCoordinator: RefreshCoordinator
  /** Injectable for test; Default is real transport. */
  request?: typeof apiRequest
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

function resolveRetryPolicy(
  authRetry: AuthRetryPolicy | undefined,
  method: string | undefined,
): AuthRetryPolicy {
  if (authRetry !== undefined) {
    return authRetry
  }

  // By default by method: read is replayed, write is not. Caller must speak clearly
  // The new intention is to replay a mutation.
  return SAFE_METHODS.has((method ?? "GET").toUpperCase()) ? "safe" : "never"
}

/**
 * API client cho protected endpoints.
 *
 * Intentionally DO NOT make `apiRequest()` an auth-aware global: public endpoint,
 * The auth protocol endpoint and Web3 RPC both use the same transport, and one
 * The global interceptor will attach tokens to places where tokens should not be.
 *
 * Invariant: one request → maximum one refresh → maximum one replay → terminal.
 */
export function createAuthenticatedApiClient({
  tokenStore,
  refreshCoordinator,
  request = apiRequest,
}: CreateAuthenticatedApiClientInput): AuthenticatedApiClient {
  /**
   * Send once. `transport` has been separated from policy options
   * auth, so there's no way they could get through to `fetch`.
   */
  async function send<T>(
    path: string,
    transport: ApiRequestOptions,
    headersInit: HeadersInit | undefined,
    idempotencyKey: string | undefined,
  ): Promise<T> {
    // Headers are newly constructed each time it is sent: mutating the caller's object will cause a replay
    // carries the previous state, and corrupts options if the caller reuses it
    // Use them for another request.
    const headers = new Headers(headersInit)

    if (idempotencyKey !== undefined) {
      headers.set("Idempotency-Key", idempotencyKey)
    }

    // Read token immediately before sending — after refresh, replay must use new token.
    const snapshot = tokenStore.get()

    return request<T>(path, {
      ...transport,
      headers,
      accessToken: snapshot?.token,
    })
  }

  return {
    async request<T>(
      path: string,
      options: AuthenticatedApiRequestOptions = {},
    ): Promise<T> {
      // Separate auth options from transport options right at the edge. Thanks to that
      // `authRetry` is actually used (for replay policy) instead of being removed
      // object before sending.
      const { authRetry, idempotencyKey, headers, ...transport } = options
      const sendOnce = () => send<T>(path, transport, headers, idempotencyKey)

      try {
        return await sendOnce()
      } catch (cause) {
        // The Auth protocol endpoint removes itself from this flow: if refresh is possible
        // trigger refresh, a 401 will become infinitely recursive.
        if (
          isAuthProtocolEndpoint(path) ||
          !isRefreshableAuthError(cause) ||
          resolveRetryPolicy(authRetry, transport.method) !== "safe"
        ) {
          throw cause
        }

        const result = await refreshCoordinator.refresh()

        if (result.outcome !== "authenticated" || result.stale) {
          // There is no longer a valid session, or logout/login has occurred while waiting.
          // Replay will now send the request with an unknown identity.
          throw cause
        }

        // Exactly one replay. Its result is terminal even if it returns 401 — no
        // Is there any caller variable that controls this loop?
        return sendOnce()
      }
    },
  }
}
