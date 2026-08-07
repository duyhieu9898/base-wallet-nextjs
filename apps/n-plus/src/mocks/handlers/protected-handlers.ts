import { http, HttpResponse } from "msw"

import { mockAuthState } from "../data/auth-session"

const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8080"

/**
 * A minimal protected resource to test authenticated API clients.
 *
 * Access token is only valid if its version is the latest version that the mock has
 * release. Test simulates "token expiration" by issuing new tokens (or
 * increase `accessTokenVersion`) without giving it to the client — just like an access token
 * expired in practice.
 */
export const PROTECTED_RESOURCE_PATH = "/me/profile"

function readTokenVersion(authorization: string | null): number | null {
  if (!authorization?.startsWith("Bearer ")) {
    return null
  }

  const match = /^mock-access-token\.(\d+)\./.exec(authorization.slice(7))

  return match === null ? null : Number(match[1])
}

function handleProtectedRequest(request: Request) {
  mockAuthState.requestCounts.protectedResource += 1

  const version = readTokenVersion(request.headers.get("authorization"))

  if (version === null) {
    return HttpResponse.json(
      { code: "ACCESS_TOKEN_INVALID", message: "Missing valid access token." },
      { status: 401 },
    )
  }

  if (version !== mockAuthState.accessTokenVersion) {
    return HttpResponse.json(
      { code: "ACCESS_TOKEN_EXPIRED", message: "Access token has expired." },
      { status: 401 },
    )
  }

  return HttpResponse.json({ tokenVersion: version, ok: true })
}

export const protectedHandlers = [
  http.get(`${baseUrl}${PROTECTED_RESOURCE_PATH}`, ({ request }) =>
    handleProtectedRequest(request),
  ),

  http.post(`${baseUrl}${PROTECTED_RESOURCE_PATH}`, ({ request }) =>
    handleProtectedRequest(request),
  ),
]
