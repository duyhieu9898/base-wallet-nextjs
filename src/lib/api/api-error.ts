export type ApiErrorPayload = {
  code?: string
  message?: string
  details?: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly details?: unknown

  constructor(status: number, payload?: ApiErrorPayload) {
    super(payload?.message ?? `API request failed with status ${status}`)

    this.name = "ApiError"
    this.status = status
    this.code = payload?.code
    this.details = payload?.details
  }
}

/**
 * The backend responded definitively that the request was invalid (4xx).
 *
 * This boundary is more important than it seems: 4xx is **evidence**, while 5xx is
 * and network error just means *unknown*. Combining the two groups will make one
 * The intermittent server is interpreted as "the server has refused" — with auth, that's posting
 * Exposing users unfairly, with the retry policy, that's giving up too early.
 */
export function isDefinitiveClientError(error: unknown): boolean {
  return error instanceof ApiError && error.status >= 400 && error.status < 500
}

/**
 * Undetermined result: server error, network failure, or non-HTTP error.
 * Exact opposite of `isDefinitiveClientError`.
 */
export function isUndeterminedError(error: unknown): boolean {
  return !isDefinitiveClientError(error)
}
