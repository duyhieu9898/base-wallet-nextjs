import { ApiError, isDefinitiveClientError } from "@/lib/api/api-error"

/** Maximum number of retries for network or server errors (5xx). */
const MAX_RETRY = 2

/**
 * Retry strategy for TanStack Query:
 * - HTTP 4xx (including 401): no retry (client-side error, meaningless retry).
 * - HTTP 5xx: retry up to MAX_RETRY times.
 * - Network error/abort (not ApiError): retry up to MAX_RETRY times.
 */
export function shouldRetryQuery(
  failureCount: number,
  error: unknown,
): boolean {
  // 4xx is the backend's definitive answer — retrying is pointless.
  if (isDefinitiveClientError(error)) {
    return false
  }

  if (error instanceof ApiError) {
    return error.status >= 500 && failureCount < MAX_RETRY
  }

  return failureCount < MAX_RETRY
}
