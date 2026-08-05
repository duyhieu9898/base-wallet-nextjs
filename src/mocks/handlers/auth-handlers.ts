import { HTTP_STATUS, API_ERROR_CODES } from "@/constants/status-codes"
import { delay, http, HttpResponse } from "msw"
import { recoverMessageAddress, type Address } from "viem"

import { authEndpoints } from "@/features/auth/api/auth-api"
import {
  requestSiweNonceInputSchema,
  verifySiweInputSchema,
} from "@/features/auth/domain/auth.schemas"
import { isSameAddress, isValidAddress } from "@/web3/core/address.utils"
import { parseSiweMessage } from "./parse-siwe-message"
import {
  mockAuthState,
  mockUserIdForAddress,
  type MockAuthFailureMode,
  type MockRefreshSession,
} from "../data/auth-session"

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

const NONCE_TTL_MS = 5 * 60 * 1000
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000

type Endpoint = "nonce" | "verify" | "refresh" | "logout"

function jsonError(status: number, code: string, message: string) {
  return HttpResponse.json({ code, message }, { status })
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
  accessTokenExpiresAt: string
} {
  mockAuthState.accessTokenVersion += 1

  return {
    accessToken: `mock-access-token.${mockAuthState.accessTokenVersion}.${walletAddress.toLowerCase()}`,
    accessTokenExpiresAt: new Date(
      Date.now() + ACCESS_TOKEN_TTL_MS,
    ).toISOString(),
  }
}

function buildAuthenticatedPayload(session: MockRefreshSession) {
  return {
    authenticated: true as const,
    user: {
      id: session.userId,
      walletAddress: session.walletAddress,
      roles: ["user"],
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

    return HttpResponse.json({
      nonce,
      issuedAt: issuedAt.toISOString(),
      expirationTime: expirationTime.toISOString(),
    })
  }),

  http.post(`${baseUrl}${authEndpoints.verify}`, async ({ request }) => {
    const short = await applyEndpointMode("verify")

    if (short) {
      return short
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

    // Recovery EIP-191 is real, just like backend production should do: right signature
    // restore the correct address written in the message.
    //
    // Previously this matched a built-in signature format. That way just works
    // with test — real signatures from MetaMask are always rejected, so `pnpm dev` with wallet
    // I can never log in. A mock can only be used by testing
    // Can't simulate anything.
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

    const session = createRefreshSession(record.walletAddress)

    return HttpResponse.json(buildAuthenticatedPayload(session), {
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
      // Reuse detection: an old token is reused, meaning the token has
      // may have leaked — revoke the whole family, not just the current session.
      revokeFamily(session.familyId)
      mockAuthState.currentRefreshCookieId = null

      return jsonError(
        401,
        "REFRESH_SESSION_REVOKED",
        "Detect refresh token reuse.",
      )
    }

    // Rotation: the old session expires as soon as the new session is released.
    session.revoked = true

    const rotated = createRefreshSession(session.walletAddress, {
      familyId: session.familyId,
      userId: session.userId,
    })

    return HttpResponse.json(buildAuthenticatedPayload(rotated), {
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

    // Idempotent: callback when there is no longer a session still returns 204.
    return new HttpResponse(null, {
      status: HTTP_STATUS.NO_CONTENT,
      headers: refreshCookieHeaders(null),
    })
  }),
]
