import { HTTP_STATUS, API_ERROR_CODES } from "@/constants/status-codes"
import { delay, http, HttpResponse } from "msw"
import { recoverMessageAddress, type Address } from "viem"

import { authEndpoints } from "@/features/auth/api/auth-api"
import {
  requestSiweNonceInputSchema,
  verifySiweInputSchema,
} from "@/features/auth/domain/auth.schemas"
import { isSameAddress, isValidAddress } from "@nln/web3-evm/address"
import { parseSiweMessage } from "./parse-siwe-message"
import {
  mockAuthState,
  mockUserIdForAddress,
  type MockAuthFailureMode,
  type MockRefreshSession,
} from "../data/auth-session"

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

const NONCE_TTL_MS = 5 * 60 * 1000
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60

type Endpoint = "nonce" | "verify" | "refresh" | "logout"

function jsonError(status: number, code: string, message?: string) {
  return HttpResponse.json(
    {
      error: code,
      code,
      message: message ?? code,
      timestamp: new Date().toISOString(),
    },
    { status },
  )
}

/**
 * Apply the configured delay and failure mode to the endpoint.
 *
 * Returning `Response` means the handler must stop immediately — this is how to test the network pump
 * error / 5xx / delay without needing to change the handler.
 */
async function applyEndpointMode(endpoint: Endpoint): Promise<Response | null> {
  mockAuthState.requestCounts[endpoint] += 1

  const configuredDelay = mockAuthState.delays[endpoint]

  if (configuredDelay > 0) {
    await delay(configuredDelay)
  }

  const mode: MockAuthFailureMode = mockAuthState.failureModes[endpoint]

  if (mode === "network-error") {
    return HttpResponse.error()
  }

  if (mode === "server-error") {
    return jsonError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      API_ERROR_CODES.INTERNAL_ERROR,
      "Mock backend error.",
    )
  }

  return null
}

function issueAccessToken(walletAddress: Address): {
  accessToken: string
  expiresIn: number
} {
  mockAuthState.accessTokenVersion += 1

  return {
    accessToken: `mock-access-token.${mockAuthState.accessTokenVersion}.${walletAddress.toLowerCase()}`,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  }
}

function buildUserAuthResponsePayload(session: MockRefreshSession) {
  return {
    user: {
      id: session.userId,
      walletAddress: session.walletAddress,
      memberCode: "NP000001",
    },
    position: {
      id: "pos-001",
      positionIndex: 0,
      referralCode: "NPLUS-REF1",
      createdAt: new Date().toISOString(),
    },
    ...issueAccessToken(session.walletAddress),
  }
}

function buildSiweVerifyAuthenticatedPayload(session: MockRefreshSession) {
  return {
    status: "authenticated" as const,
    user: {
      id: session.userId,
      walletAddress: session.walletAddress,
      memberCode: "NP000001",
    },
    position: {
      id: "pos-001",
      positionIndex: 0,
      referralCode: "NPLUS-REF1",
      createdAt: new Date().toISOString(),
    },
    ...issueAccessToken(session.walletAddress),
  }
}

/**
 * `Set-Cookie` here only describes the contract. The real browser implements HttpOnly;
 * JSDOM/MSW doesn't prove it, so the mock's source of truth is
 * `currentRefreshCookieId` trong state.
 */
function refreshCookieHeaders(sessionId: string | null): HeadersInit {
  return {
    "Set-Cookie":
      sessionId === null
        ? "refresh_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
        : `refresh_token=${sessionId}; Path=/; HttpOnly; SameSite=Lax`,
  }
}

function createRefreshSession(
  walletAddress: Address,
  options: { familyId?: string; userId?: string } = {},
): MockRefreshSession {
  mockAuthState.sessionCounter += 1

  const session: MockRefreshSession = {
    id: `refresh_${mockAuthState.sessionCounter}`,
    userId: options.userId ?? mockUserIdForAddress(walletAddress),
    walletAddress,
    familyId: options.familyId ?? `family_${mockAuthState.sessionCounter}`,
    revoked: false,
  }

  mockAuthState.refreshSessions.set(session.id, session)
  mockAuthState.currentRefreshCookieId = session.id

  return session
}

function revokeFamily(familyId: string): void {
  for (const session of mockAuthState.refreshSessions.values()) {
    if (session.familyId === familyId) {
      session.revoked = true
    }
  }
}

export const authHandlers = [
  http.post(`${baseUrl}${authEndpoints.nonce}`, async ({ request }) => {
    const short = await applyEndpointMode("nonce")

    if (short) {
      return short
    }

    const origin = request.headers.get("origin")
    if (origin === "http://unauthorized-origin.test") {
      return jsonError(403, "originRejected", "Origin is not on the allowlist")
    }

    const raw = await request.json().catch(() => null)
    const parsed = requestSiweNonceInputSchema.safeParse(raw)

    if (!parsed.success) {
      return jsonError(
        400,
        "INVALID_REQUEST",
        "The requested nonce is not valid.",
      )
    }

    mockAuthState.nonceCounter += 1

    const issuedAt = new Date()
    const expirationTime = new Date(issuedAt.getTime() + NONCE_TTL_MS)
    const nonce = `nonce-${mockAuthState.nonceCounter}-${issuedAt.getTime()}`

    mockAuthState.nonceRecords.set(nonce, {
      nonce,
      walletAddress: parsed.data.walletAddress,
      chainId: parsed.data.chainId,
      issuedAt: issuedAt.toISOString(),
      expirationTime: expirationTime.toISOString(),
      consumed: false,
    })

    let domain = "localhost:3000"
    let uri = "http://localhost:3000"
    if (origin) {
      try {
        const u = new URL(origin)
        domain = u.host
        uri = origin
      } catch {
        // keep fallback
      }
    }

    return HttpResponse.json({
      nonce,
      issuedAt: issuedAt.toISOString(),
      expirationTime: expirationTime.toISOString(),
      domain,
      uri,
    })
  }),

  http.post(`${baseUrl}${authEndpoints.verify}`, async ({ request }) => {
    const short = await applyEndpointMode("verify")

    if (short) {
      return short
    }

    const origin = request.headers.get("origin")
    if (origin === "http://unauthorized-origin.test") {
      return jsonError(403, "originRejected", "Origin is not on the allowlist")
    }

    const raw = await request.json().catch(() => null)
    const parsed = verifySiweInputSchema.safeParse(raw)

    if (!parsed.success) {
      return jsonError(
        400,
        "INVALID_REQUEST",
        "The verification request is not valid.",
      )
    }

    const message = parseSiweMessage(parsed.data.message)

    if (message === null) {
      return jsonError(400, "INVALID_REQUEST", "SIWE message is invalid.")
    }

    const record = mockAuthState.nonceRecords.get(message.nonce)

    if (!record) {
      return jsonError(401, "INVALID_SIWE_NONCE", "Nonce does not exist.")
    }

    if (record.consumed) {
      return jsonError(401, "INVALID_SIWE_NONCE", "Nonce has been used.")
    }

    if (Date.parse(record.expirationTime) <= Date.now()) {
      return jsonError(401, "INVALID_SIWE_NONCE", "Nonce has expired.")
    }

    if (
      !isValidAddress(message.address) ||
      !isSameAddress(message.address, record.walletAddress)
    ) {
      return jsonError(
        401,
        "INVALID_SIWE_SIGNATURE",
        "The address in the message does not match the nonce.",
      )
    }

    if (message.chainId !== record.chainId) {
      return jsonError(
        401,
        "INVALID_SIWE_NONCE",
        "Chain ID does not match the issued nonce.",
      )
    }

    const recovered = await recoverMessageAddress({
      message: parsed.data.message,
      signature: parsed.data.signature,
    }).catch(() => null)

    if (recovered === null || !isSameAddress(recovered, message.address)) {
      return jsonError(
        401,
        "INVALID_SIWE_SIGNATURE",
        "The signature does not match the signer.",
      )
    }

    record.consumed = true

    const isUnregistered =
      mockAuthState.unregisteredWallets.has(
        record.walletAddress.toLowerCase(),
      ) ||
      record.walletAddress.toLowerCase() ===
        "0x9999999999999999999999999999999999999999" ||
      request.headers.get("x-mock-registration-required") === "true"

    if (isUnregistered) {
      const registrationTicket = `ticket-${record.walletAddress.toLowerCase()}`
      mockAuthState.registrationTickets.set(registrationTicket, {
        walletAddress: record.walletAddress,
        used: false,
      })
      return HttpResponse.json({
        status: "registrationRequired" as const,
        walletAddress: record.walletAddress,
        registrationTicket,
      })
    }

    const session = createRefreshSession(record.walletAddress)

    return HttpResponse.json(buildSiweVerifyAuthenticatedPayload(session), {
      headers: refreshCookieHeaders(session.id),
    })
  }),

  http.post(`${baseUrl}${authEndpoints.refresh}`, async () => {
    const short = await applyEndpointMode("refresh")

    if (short) {
      return short
    }

    const mode = mockAuthState.failureModes.refresh
    const sessionId = mockAuthState.currentRefreshCookieId
    const session =
      sessionId === null
        ? undefined
        : mockAuthState.refreshSessions.get(sessionId)

    if (mode === "refresh-expired" || !session) {
      return jsonError(
        401,
        "REFRESH_SESSION_EXPIRED",
        "Login session has expired.",
      )
    }

    if (mode === "refresh-revoked" || session.revoked) {
      return jsonError(
        401,
        "REFRESH_SESSION_REVOKED",
        "The login session has been revoked.",
      )
    }

    if (mode === "refresh-reuse") {
      revokeFamily(session.familyId)
      mockAuthState.currentRefreshCookieId = null

      return jsonError(
        401,
        "REFRESH_SESSION_REVOKED",
        "Detect refresh token reuse.",
      )
    }

    session.revoked = true

    const rotated = createRefreshSession(session.walletAddress, {
      familyId: session.familyId,
      userId: session.userId,
    })

    return HttpResponse.json(buildUserAuthResponsePayload(rotated), {
      headers: refreshCookieHeaders(rotated.id),
    })
  }),

  http.post(`${baseUrl}${authEndpoints.logout}`, async () => {
    const short = await applyEndpointMode("logout")

    if (short) {
      return short
    }

    const sessionId = mockAuthState.currentRefreshCookieId
    const session =
      sessionId === null
        ? undefined
        : mockAuthState.refreshSessions.get(sessionId)

    if (session) {
      revokeFamily(session.familyId)
    }

    mockAuthState.currentRefreshCookieId = null

    return new HttpResponse(null, {
      status: HTTP_STATUS.NO_CONTENT,
      headers: refreshCookieHeaders(null),
    })
  }),

  // Bind session to selected position
  http.post(
    `${baseUrl}${authEndpoints.positionSelect}`,
    async ({ request }) => {
      const authHeader = request.headers.get("Authorization")
      if (
        authHeader === "Bearer invalid" ||
        authHeader === "Bearer expired" ||
        request.headers.get("x-mock-unauthorized") === "true"
      ) {
        return jsonError(401, "UNAUTHORIZED", "Missing or invalid access token")
      }

      const body = (await request.json().catch(() => ({}))) as {
        positionId?: string
      }

      if (!body.positionId) {
        return jsonError(400, "INVALID_REQUEST", "positionId is required")
      }

      if (body.positionId !== "pos-001" && body.positionId !== "pos-002") {
        return jsonError(
          404,
          "POSITION_NOT_FOUND",
          "No such position, or it belongs to another member",
        )
      }

      const sessionId = mockAuthState.currentRefreshCookieId
      const session = sessionId
        ? mockAuthState.refreshSessions.get(sessionId)
        : undefined

      const walletAddress =
        session?.walletAddress ??
        ("0x1234567890abcdef1234567890abcdef12345678" as Address)

      return HttpResponse.json({
        user: {
          id: session?.userId ?? "user-001",
          walletAddress,
          memberCode: "NP000001",
        },
        position: {
          id: body.positionId,
          positionIndex: body.positionId === "pos-002" ? 1 : 0,
          referralCode:
            body.positionId === "pos-002" ? "NPLUS-REF2" : "NPLUS-REF1",
          createdAt: new Date().toISOString(),
        },
        ...issueAccessToken(walletAddress),
      })
    },
  ),

  // Current member profile
  http.get(`${baseUrl}${authEndpoints.profile}`, async ({ request }) => {
    const authHeader = request.headers.get("Authorization")
    if (
      authHeader === "Bearer invalid" ||
      authHeader === "Bearer expired" ||
      request.headers.get("x-mock-unauthorized") === "true"
    ) {
      return jsonError(401, "UNAUTHORIZED", "Missing or invalid access token")
    }

    const sessionId = mockAuthState.currentRefreshCookieId
    const session = sessionId
      ? mockAuthState.refreshSessions.get(sessionId)
      : undefined

    const walletAddress =
      session?.walletAddress ??
      ("0x1234567890abcdef1234567890abcdef12345678" as Address)

    return HttpResponse.json({
      user: {
        id: session?.userId ?? "user-001",
        walletAddress,
        memberCode: "NP000001",
      },
      position: {
        id: "pos-001",
        positionIndex: 0,
        referralCode: "NPLUS-REF1",
        createdAt: new Date().toISOString(),
      },
      ...issueAccessToken(walletAddress),
    })
  }),
]
