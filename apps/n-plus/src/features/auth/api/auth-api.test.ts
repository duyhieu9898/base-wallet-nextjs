import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"

import { buildSiweMessage } from "@/features/auth/domain/siwe-message"
import {
  MOCK_ADDRESS,
  MOCK_OTHER_ADDRESS,
  mockAuthState,
  mockOtherSigner,
  mockSigner,
  setMockAuthFailureMode,
  signMockMessage,
} from "@/mocks/data/auth-session"
import { server } from "@/mocks/server"
import {
  authEndpoints,
  logout,
  refreshSession,
  requestSiweNonce,
  verifySiwe,
} from "./auth-api"

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

const ADDRESS = MOCK_ADDRESS
const OTHER_ADDRESS = MOCK_OTHER_ADDRESS
const CHAIN_ID = 11155111

async function signIn(signer = mockSigner) {
  const address = signer.address
  const nonce = await requestSiweNonce({
    walletAddress: address,
    chainId: CHAIN_ID,
  })

  const message = buildSiweMessage({
    domain: "localhost:3000",
    address,
    uri: "http://localhost:3000",
    chainId: CHAIN_ID,
    nonce: nonce.nonce,
    issuedAt: nonce.issuedAt,
    expirationTime: nonce.expirationTime,
  })

  const payload = await verifySiwe({
    message,
    signature: await signMockMessage(message, signer),
  })

  if (payload.status !== "authenticated") {
    throw new Error("Expected authenticated payload from signIn mock helper")
  }

  return {
    nonce,
    message,
    payload,
  }
}

describe("request nonce", () => {
  it("returns a nonce bound to the requested address and chain", async () => {
    const response = await requestSiweNonce({
      walletAddress: ADDRESS,
      chainId: CHAIN_ID,
    })

    expect(response.nonce.length).toBeGreaterThan(0)
    expect(Date.parse(response.expirationTime)).toBeGreaterThan(
      Date.parse(response.issuedAt),
    )

    const record = mockAuthState.nonceRecords.get(response.nonce)

    expect(record?.walletAddress).toBe(ADDRESS)
    expect(record?.chainId).toBe(CHAIN_ID)
    expect(record?.consumed).toBe(false)
  })

  it("issues a unique nonce per request", async () => {
    const first = await requestSiweNonce({
      walletAddress: ADDRESS,
      chainId: CHAIN_ID,
    })
    const second = await requestSiweNonce({
      walletAddress: ADDRESS,
      chainId: CHAIN_ID,
    })

    expect(first.nonce).not.toBe(second.nonce)
  })

  it("rejects a malformed nonce response", async () => {
    server.use(
      http.post(`${baseUrl}${authEndpoints.nonce}`, () =>
        HttpResponse.json({ nonce: "", issuedAt: "x", expirationTime: "y" }),
      ),
    )

    await expect(
      requestSiweNonce({ walletAddress: ADDRESS, chainId: CHAIN_ID }),
    ).rejects.toMatchObject({ code: "INVALID_AUTH_RESPONSE" })
  })

  it("maps backend failure to NONCE_REQUEST_FAILED", async () => {
    setMockAuthFailureMode("nonce", "server-error")

    await expect(
      requestSiweNonce({ walletAddress: ADDRESS, chainId: CHAIN_ID }),
    ).rejects.toMatchObject({ code: "NONCE_REQUEST_FAILED" })
  })
})

describe("verify siwe", () => {
  it("returns an authenticated payload bound to the signing address", async () => {
    const { payload } = await signIn()

    expect(payload.status).toBe("authenticated")
    if (payload.status === "authenticated") {
      expect(payload.user.walletAddress).toBe(ADDRESS)
      expect(payload.accessToken.length).toBeGreaterThan(0)
      expect(payload.expiresIn).toBeGreaterThan(0)
    }
  })

  it("never returns a refresh token in the response body", async () => {
    const { payload } = await signIn()

    expect(JSON.stringify(payload)).not.toContain("refresh")
  })

  it("consumes the nonce so it cannot be replayed", async () => {
    const { message } = await signIn()

    await expect(
      verifySiwe({ message, signature: await signMockMessage(message) }),
    ).rejects.toMatchObject({ code: "SIWE_VERIFY_REJECTED" })
  })

  it("rejects an unknown nonce", async () => {
    const message = buildSiweMessage({
      domain: "localhost:3000",
      address: ADDRESS,
      uri: "http://localhost:3000",
      chainId: CHAIN_ID,
      nonce: "never-issued",
      issuedAt: new Date().toISOString(),
    })

    await expect(
      verifySiwe({ message, signature: await signMockMessage(message) }),
    ).rejects.toMatchObject({ code: "SIWE_VERIFY_REJECTED" })
  })

  it("rejects an expired nonce", async () => {
    const nonce = await requestSiweNonce({
      walletAddress: ADDRESS,
      chainId: CHAIN_ID,
    })

    const record = mockAuthState.nonceRecords.get(nonce.nonce)

    if (record) {
      record.expirationTime = new Date(Date.now() - 1000).toISOString()
    }

    const message = buildSiweMessage({
      domain: "localhost:3000",
      address: ADDRESS,
      uri: "http://localhost:3000",
      chainId: CHAIN_ID,
      nonce: nonce.nonce,
      issuedAt: nonce.issuedAt,
    })

    await expect(
      verifySiwe({ message, signature: await signMockMessage(message) }),
    ).rejects.toMatchObject({ code: "SIWE_VERIFY_REJECTED" })
  })

  it("rejects a message whose address differs from the nonce address", async () => {
    const nonce = await requestSiweNonce({
      walletAddress: ADDRESS,
      chainId: CHAIN_ID,
    })

    const message = buildSiweMessage({
      domain: "localhost:3000",
      address: OTHER_ADDRESS,
      uri: "http://localhost:3000",
      chainId: CHAIN_ID,
      nonce: nonce.nonce,
      issuedAt: nonce.issuedAt,
    })

    await expect(
      verifySiwe({
        message,
        signature: await signMockMessage(message, mockOtherSigner),
      }),
    ).rejects.toMatchObject({ code: "SIWE_VERIFY_REJECTED" })
  })

  it("rejects a signature produced by a different signer", async () => {
    const nonce = await requestSiweNonce({
      walletAddress: ADDRESS,
      chainId: CHAIN_ID,
    })

    const message = buildSiweMessage({
      domain: "localhost:3000",
      address: ADDRESS,
      uri: "http://localhost:3000",
      chainId: CHAIN_ID,
      nonce: nonce.nonce,
      issuedAt: nonce.issuedAt,
    })

    await expect(
      verifySiwe({
        message,
        signature: await signMockMessage(message, mockOtherSigner),
      }),
    ).rejects.toMatchObject({ code: "SIWE_VERIFY_REJECTED" })
  })

  it("rejects a chain id that does not match the issued nonce", async () => {
    const nonce = await requestSiweNonce({
      walletAddress: ADDRESS,
      chainId: CHAIN_ID,
    })

    const message = buildSiweMessage({
      domain: "localhost:3000",
      address: ADDRESS,
      uri: "http://localhost:3000",
      chainId: 1,
      nonce: nonce.nonce,
      issuedAt: nonce.issuedAt,
    })

    await expect(
      verifySiwe({ message, signature: await signMockMessage(message) }),
    ).rejects.toMatchObject({ code: "SIWE_VERIFY_REJECTED" })
  })

  it("separates backend unavailability from rejection", async () => {
    const nonce = await requestSiweNonce({
      walletAddress: ADDRESS,
      chainId: CHAIN_ID,
    })

    setMockAuthFailureMode("verify", "server-error")

    const message = buildSiweMessage({
      domain: "localhost:3000",
      address: ADDRESS,
      uri: "http://localhost:3000",
      chainId: CHAIN_ID,
      nonce: nonce.nonce,
      issuedAt: nonce.issuedAt,
    })

    await expect(
      verifySiwe({ message, signature: await signMockMessage(message) }),
    ).rejects.toMatchObject({ code: "SIWE_VERIFY_FAILED" })
  })
})

describe("refresh session", () => {
  it("returns a new access token after sign-in", async () => {
    const { payload } = await signIn()

    const refreshed = await refreshSession()

    expect(refreshed.user.walletAddress).toBe(ADDRESS)
    expect(refreshed.accessToken).not.toBe(payload.accessToken)
  })

  it("rotates the refresh session so the previous one is revoked", async () => {
    await signIn()

    const firstSessionId = mockAuthState.currentRefreshCookieId

    await refreshSession()

    expect(mockAuthState.currentRefreshCookieId).not.toBe(firstSessionId)
    expect(
      mockAuthState.refreshSessions.get(firstSessionId ?? "")?.revoked,
    ).toBe(true)
  })

  it("rejects when there is no refresh session", async () => {
    await expect(refreshSession()).rejects.toMatchObject({
      code: "REFRESH_REJECTED",
    })
  })

  it("rejects a revoked refresh session", async () => {
    await signIn()
    setMockAuthFailureMode("refresh", "refresh-revoked")

    await expect(refreshSession()).rejects.toMatchObject({
      code: "REFRESH_REJECTED",
    })
  })

  it("revokes the whole family when reuse is detected", async () => {
    await signIn()
    setMockAuthFailureMode("refresh", "refresh-reuse")

    await expect(refreshSession()).rejects.toMatchObject({
      code: "REFRESH_REJECTED",
    })

    expect(mockAuthState.currentRefreshCookieId).toBeNull()
    expect(
      [...mockAuthState.refreshSessions.values()].every(
        (session) => session.revoked,
      ),
    ).toBe(true)
  })

  it("classifies a server error as undetermined, not unauthenticated", async () => {
    await signIn()
    setMockAuthFailureMode("refresh", "server-error")

    await expect(refreshSession()).rejects.toMatchObject({
      code: "REFRESH_FAILED",
    })
  })

  it("classifies a network error as undetermined", async () => {
    await signIn()
    setMockAuthFailureMode("refresh", "network-error")

    await expect(refreshSession()).rejects.toMatchObject({
      code: "REFRESH_FAILED",
    })
  })

  it("rejects a malformed refresh payload without inferring logout", async () => {
    server.use(
      http.post(`${baseUrl}${authEndpoints.refresh}`, () =>
        HttpResponse.json({ authenticated: true, user: null }),
      ),
    )

    await expect(refreshSession()).rejects.toMatchObject({
      code: "INVALID_AUTH_RESPONSE",
    })
  })
})

describe("logout", () => {
  it("revokes the refresh session", async () => {
    await signIn()

    await logout()

    expect(mockAuthState.currentRefreshCookieId).toBeNull()
    await expect(refreshSession()).rejects.toMatchObject({
      code: "REFRESH_REJECTED",
    })
  })

  it("is idempotent when no session exists", async () => {
    await signIn()

    await logout()

    await expect(logout()).resolves.toBeUndefined()
  })

  it("treats an already-absent session response as terminal success", async () => {
    server.use(
      http.post(`${baseUrl}${authEndpoints.logout}`, () =>
        HttpResponse.json({ code: "REFRESH_SESSION_EXPIRED" }, { status: 401 }),
      ),
    )

    await expect(logout()).resolves.toBeUndefined()
  })

  it("does not claim success when the backend is unavailable", async () => {
    await signIn()
    setMockAuthFailureMode("logout", "server-error")

    await expect(logout()).rejects.toMatchObject({ code: "LOGOUT_FAILED" })
  })

  it("does not claim success on a network error", async () => {
    await signIn()
    setMockAuthFailureMode("logout", "network-error")

    await expect(logout()).rejects.toMatchObject({ code: "LOGOUT_FAILED" })
  })
})

describe("mock state isolation", () => {
  it("starts each test without a refresh session", async () => {
    expect(mockAuthState.currentRefreshCookieId).toBeNull()
    expect(mockAuthState.nonceRecords.size).toBe(0)
    expect(mockAuthState.requestCounts.refresh).toBe(0)
  })
})
