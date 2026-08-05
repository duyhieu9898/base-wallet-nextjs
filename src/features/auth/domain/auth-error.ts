import { ApiError, isDefinitiveClientError } from "@/lib/api/api-error"
import { isUserRejectedWalletRequest } from "@/web3/evm/errors"
/**
 * Auth-specific error taxonomy. Intentionally DO NOT reuse `EvmWeb3Error`: auth
 * is an application concern, Web3 foundation must not depend on it.
 *
 * The message here is a visible message — it never contains an access token,
 * signature, raw RPC payload or raw backend payload. The root cause stays within
 * `cause` to debug.
 */
export type AuthErrorCode =
  /** Auth runtime cannot work (e.g. EVM is disabled, config is wrong). */
  | "AUTH_UNAVAILABLE"
  /** Backend returns payload with incorrect schema. */
  | "INVALID_AUTH_RESPONSE"
  /** Backend says there is no valid refresh session — terminal unauthenticated. */
  | "REFRESH_REJECTED"
  /** Unable to identify session (network / 5xx) — NOT unauthenticated. */
  | "REFRESH_FAILED"
  | "NONCE_REQUEST_FAILED"
  /** User clicks decline in wallet. */
  | "SIGNATURE_REJECTED"
  | "SIGNATURE_FAILED"
  /** Wallet address/chain changes midway, making the operation stale. */
  | "WALLET_CHANGED"
  | "WALLET_DISCONNECTED"
  /** The wallet has not yet resolved the account/chain — not yet eligible to start signing. */
  | "WALLET_NOT_READY"
  /** The wallet is on a chain outside the registry; Must switch network before signing. */
  | "UNSUPPORTED_NETWORK"
  /** Backend rejects signature/nonce. */
  | "SIWE_VERIFY_REJECTED"
  | "SIWE_VERIFY_FAILED"
  | "LOGOUT_FAILED"
  /** Unforeseen error — not assigned to a specific code by mistake. */
  | "UNEXPECTED_AUTH_FAILURE"
  /** Guard: action requires authenticated session. */
  | "AUTH_REQUIRED"
  /** Guard: session exists but wallet is connecting to different address. */
  | "AUTH_WALLET_MISMATCH"
  /** Guard: session exists but no wallet is connected. */
  | "AUTH_WALLET_DISCONNECTED"

type AuthErrorOptions = {
  code: AuthErrorCode
  message: string
  cause?: unknown
}

export class AuthError extends Error {
  readonly code: AuthErrorCode
  override readonly cause: unknown

  constructor({ code, message, cause }: AuthErrorOptions) {
    super(message)
    this.name = "AuthError"
    this.code = code
    this.cause = cause
  }
}

export function createAuthError(
  code: AuthErrorCode,
  message: string,
  cause?: unknown,
): AuthError {
  return new AuthError({ code, message, cause })
}

function isAuthError(value: unknown): value is AuthError {
  return value instanceof AuthError
}

/**
 * The only backend code that allows the frontend to refresh itself.
 *
 * Intentionally not declaring the full union of the backend code: an empty list
 * Whoever makes the reference will deviate from reality without anyone detecting it. The source of truth is
 * this `Set` itself.
 */
const REFRESHABLE_ACCESS_TOKEN_ERROR_CODES = new Set<string>([
  "ACCESS_TOKEN_EXPIRED",
  "ACCESS_TOKEN_INVALID",
])

/**
 * Not every 401 means the access token has expired. Only 401 with attached code
 * newly refreshed access-token error group; 401 due to wrong signature or wrong nonce
 * refresh session is revoke as terminal.
 */
export function isRefreshableAuthError(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 401) {
    return false
  }

  return error.code !== undefined
    ? REFRESHABLE_ACCESS_TOKEN_ERROR_CODES.has(error.code)
    : // Backend does not send code: consider 401 on protected endpoint as access-token
      // expired. The Refresh endpoint removes itself from this flow at the API client.
      true
}

/**
 * Sanitize the strange error message before injecting `AuthError`.
 *
 * Keep only the first line: viem/fetch's multi-line messages often include requests
 * payload, header and version string — not suitable for display.
 */
function sanitizeMessage(message: string, fallback: string): string {
  return message.split("\n")[0]?.trim() || fallback
}

/**
 * Convert errors from wallet signing to `AuthError`.
 *
 * User rejection is a normal retry state, not a failure
 * system — it is separated from the code so that the UI does not show up as a backend error.
 */
export function toSignatureAuthError(cause: unknown): AuthError {
  if (isAuthError(cause)) {
    return cause
  }

  if (isUserRejectedWalletRequest(cause)) {
    return createAuthError(
      "SIGNATURE_REJECTED",
      "Signature request was rejected in wallet.",
      cause,
    )
  }

  return createAuthError(
    "SIGNATURE_FAILED",
    cause instanceof Error
      ? sanitizeMessage(cause.message, "Could not sign the sign-in message.")
      : "Could not sign the sign-in message.",
    cause,
  )
}

type ApiErrorMapping = {
  /** Code used when the backend explicitly denies (4xx). */
  rejected: AuthErrorCode
  /** Code used when the result cannot be determined (network, 5xx). */
  failed: AuthErrorCode
  rejectedMessage: string
  failedMessage: string
}

/**
 * Distinguish "rejected backend" from "undetermined".
 *
 * This boundary determines the session state: 4xx is terminal evidence, also
 * network/5xx just means unknown — not to be interpreted as unauthenticated.
 */
function toApiAuthError(cause: unknown, mapping: ApiErrorMapping): AuthError {
  if (isAuthError(cause)) {
    return cause
  }

  if (isDefinitiveClientError(cause)) {
    return createAuthError(mapping.rejected, mapping.rejectedMessage, cause)
  }

  return createAuthError(mapping.failed, mapping.failedMessage, cause)
}

export function toRefreshAuthError(cause: unknown): AuthError {
  return toApiAuthError(cause, {
    rejected: "REFRESH_REJECTED",
    failed: "REFRESH_FAILED",
    rejectedMessage: "Your session is no longer valid.",
    failedMessage: "Could not verify your session right now.",
  })
}

export function toVerifyAuthError(cause: unknown): AuthError {
  return toApiAuthError(cause, {
    rejected: "SIWE_VERIFY_REJECTED",
    failed: "SIWE_VERIFY_FAILED",
    rejectedMessage: "The sign-in signature was not accepted.",
    failedMessage: "Could not complete sign-in right now.",
  })
}

/**
 * The nonce intentionally does NOT go through `toApiAuthError`.
 *
 * The 4xx/5xx distinction exists to decide the fate of a session. Please nonce is
 * initialization step — no session to lose, and whether the backend rejects it or not
 * If the call is successful, all the user needs to do is try again. Force it into the mapping only
 * creates two branches giving the same result.
 */
export function toNonceAuthError(cause: unknown): AuthError {
  if (isAuthError(cause)) {
    return cause
  }

  return createAuthError(
    "NONCE_REQUEST_FAILED",
    "Could not start the sign-in request.",
    cause,
  )
}

export function toLogoutAuthError(cause: unknown): AuthError {
  return toApiAuthError(cause, {
    rejected: "LOGOUT_FAILED",
    failed: "LOGOUT_FAILED",
    rejectedMessage: "Could not sign out.",
    failedMessage: "Could not sign out right now.",
  })
}

/**
 * Fallback for unforeseen errors anywhere in the auth flow.
 *
 * Exists to NOT have to borrow a specific code as a catch-all: assigning any strange errors
 * to `SIGNATURE_FAILED` will notify the user that the signing failed, inclusive
 * when the wallet has never been opened.
 */
export function toUnexpectedAuthError(cause: unknown): AuthError {
  if (isAuthError(cause)) {
    return cause
  }

  return createAuthError(
    "UNEXPECTED_AUTH_FAILURE",
    "Sign-in could not be completed.",
    cause,
  )
}

/**
 * Schema validation error. The original payload is NOT included in the message because it can be
 * contains access token.
 */
export function toInvalidAuthResponseError(cause: unknown): AuthError {
  return createAuthError(
    "INVALID_AUTH_RESPONSE",
    "Received an invalid authentication response.",
    cause,
  )
}
