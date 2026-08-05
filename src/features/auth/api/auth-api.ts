import { HTTP_STATUS } from "@/constants/status-codes"
import { ApiError } from "@/lib/api/api-error"
import { api } from "@/lib/api"
import {
  authenticatedSessionPayloadSchema,
  siweNonceResponseSchema,
} from "@/features/auth/domain/auth.schemas"
import type {
  AuthenticatedSessionPayload,
  RequestSiweNonceInput,
  SiweNonceResponse,
  VerifySiweInput,
} from "@/features/auth/domain/auth.schemas"
import {
  toInvalidAuthResponseError,
  toLogoutAuthError,
  toNonceAuthError,
  toRefreshAuthError,
  toVerifyAuthError,
} from "@/features/auth/domain/auth-error"

/**
 * The entire transport of the auth protocol.
 *
 * The four endpoints are in the same module because they are **one** responsibility: them
 * always change together when the protocol changes, and each function is just the same template —
 * call, map error to context, then runtime-validate response.
 */

/**
 * Endpoint path — single source for both client, mock handler and test.
 *
 * Authenticated API clients use this list to exclude themselves from auth endpoints
 * auto-refresh flow: if refresh can trigger a refresh, a 401 will occur
 * infinite loop.
 */
export const authEndpoints = {
  nonce: "/auth/siwe/nonce",
  verify: "/auth/siwe/verify",
  refresh: "/auth/refresh",
  logout: "/auth/logout",
} as const

export type AuthEndpoint = (typeof authEndpoints)[keyof typeof authEndpoints]

const authEndpointPaths: readonly string[] = Object.values(authEndpoints)

/** True when the path belongs to the auth protocol and is not automatically refreshed. */
export function isAuthProtocolEndpoint(path: string): boolean {
  const pathname = path.split("?")[0] ?? path

  return authEndpointPaths.some(
    (endpoint) => pathname === endpoint || pathname.endsWith(endpoint),
  )
}

export type AuthRequestOptions = {
  signal?: AbortSignal
}

/**
 * Ask for a nonce for a specific (address, chainId) pair.
 *
 * The nonce is bound to the address and chain by the backend: if the frontend changes the wallet after the step
 * hey, the old nonce doesn't work for the new wallet — that's desirable, not
 * error needs workaround.
 */
export async function requestSiweNonce(
  input: RequestSiweNonceInput,
  options: AuthRequestOptions = {},
): Promise<SiweNonceResponse> {
  let response: unknown

  try {
    response = await api.post<unknown>(authEndpoints.nonce, input, {
      signal: options.signal,
    })
  } catch (cause) {
    throw toNonceAuthError(cause)
  }

  const parsed = siweNonceResponseSchema.safeParse(response)

  if (!parsed.success) {
    throw toInvalidAuthResponseError(parsed.error)
  }

  return parsed.data
}

/**
 * Send message + signature for backend to verify.
 *
 * Successful verification is when the backend sets refresh cookies and issues access
 * token. Only authenticated payloads are accepted: verification has no concept
 * "success but not logged in".
 */
export async function verifySiwe(
  input: VerifySiweInput,
  options: AuthRequestOptions = {},
): Promise<AuthenticatedSessionPayload> {
  let response: unknown

  try {
    response = await api.post<unknown>(authEndpoints.verify, input, {
      signal: options.signal,
    })
  } catch (cause) {
    throw toVerifyAuthError(cause)
  }

  const parsed = authenticatedSessionPayloadSchema.safeParse(response)

  if (!parsed.success) {
    throw toInvalidAuthResponseError(parsed.error)
  }

  return parsed.data
}

/**
 * Exchange the refresh cookie for a new access token.
 *
 * Request intentionally does NOT attach an access token: refresh is only authorized by
 * HttpOnly cookies. `credentials: "include"` is preset by `apiRequest`.
 *
 * Contract finalized (see `docs/decisions/auth-session-transport.md`):
 * - 200 → authenticated payload;
 * - 401 → `REFRESH_REJECTED`, terminal unauthenticated;
 * - network/5xx → `REFRESH_FAILED`, session unknown.
 */
export async function refreshSession(
  options: AuthRequestOptions = {},
): Promise<AuthenticatedSessionPayload> {
  let response: unknown

  try {
    response = await api.post<unknown>(authEndpoints.refresh, undefined, {
      signal: options.signal,
    })
  } catch (cause) {
    throw toRefreshAuthError(cause)
  }

  const parsed = authenticatedSessionPayloadSchema.safeParse(response)

  if (!parsed.success) {
    // A strange payload is not considered a "session end": it is a contract error, and should be inferred
    // unauthenticated will then log the user out because of a backend bug.
    throw toInvalidAuthResponseError(parsed.error)
  }

  return parsed.data
}

export type LogoutOptions = AuthRequestOptions & {
  /** Current access token, if required by backend policy to identify the session. */
  accessToken?: string
}

function isSessionAlreadyAbsent(error: ApiError): boolean {
  return (
    error.status === HTTP_STATUS.UNAUTHORIZED ||
    error.status === HTTP_STATUS.NOT_FOUND
  )
}

/**
 * Revoke refresh session in backend.
 *
 * Terminal success includes 401: if the backend says the session no longer exists
 * The goal of logout has been achieved. On the contrary, network error and 5xx are NOT
 * success — presenting them as "logged out" would lie to the user that session
 * The server side has been revoke.
 */
export async function logout(options: LogoutOptions = {}): Promise<void> {
  try {
    await api.post<unknown>(authEndpoints.logout, undefined, {
      signal: options.signal,
      accessToken: options.accessToken,
    })
  } catch (cause) {
    if (cause instanceof ApiError && isSessionAlreadyAbsent(cause)) {
      return
    }

    throw toLogoutAuthError(cause)
  }
}
