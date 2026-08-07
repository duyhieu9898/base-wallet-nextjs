import { HTTP_STATUS } from "@/constants/status-codes"
import { ApiError, type ApiErrorPayload } from "./api-error"
import type { ApiRequestOptions } from "./types"

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

function isBodyAllowed(method?: string) {
  const normalizedMethod = method?.toUpperCase() ?? "GET"

  return !["GET", "HEAD"].includes(normalizedMethod)
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === HTTP_STATUS.NO_CONTENT) {
    return null
  }

  const contentType = response.headers.get("content-type")

  if (contentType?.includes("application/json")) {
    return response.json()
  }

  return response.text()
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    body,
    accessToken,
    timeout = 15_000,
    headers: initialHeaders,
    signal: callerSignal,
    ...requestOptions
  } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  // The client's timeout and the caller's abort must both cancel the request. If only
  // Using an internal signal, the `AbortController` passed by the caller will be ignored
  // completely — the request continues to run after the caller has canceled.
  const signal =
    callerSignal == null
      ? controller.signal
      : AbortSignal.any([controller.signal, callerSignal])

  const headers = new Headers(initialHeaders)

  headers.set("Accept", "application/json")

  if (body !== undefined && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`)
  }

  try {
    const response = await fetch(new URL(path, baseUrl), {
      ...requestOptions,
      headers,
      credentials: "include",
      signal,

      body:
        body === undefined || !isBodyAllowed(requestOptions.method)
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    })

    const responseBody = await parseResponseBody(response)

    if (!response.ok) {
      const payload =
        typeof responseBody === "object" && responseBody !== null
          ? (responseBody as ApiErrorPayload)
          : {
              message:
                typeof responseBody === "string" ? responseBody : undefined,
            }

      throw new ApiError(response.status, payload)
    }

    return responseBody as T
  } finally {
    clearTimeout(timeoutId)
  }
}
