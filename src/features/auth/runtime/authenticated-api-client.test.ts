import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api/api-error"
import {
  authEndpoints,
  requestSiweNonce,
  verifySiwe,
} from "@/features/auth/api/auth-api"
import { buildSiweMessage } from "@/features/auth/domain/siwe-message"
import {
  MOCK_ADDRESS,
  signMockMessage,
  mockAuthState,
} from "@/mocks/data/auth-session"
import { PROTECTED_RESOURCE_PATH } from "@/mocks/handlers/protected-handlers"
import {
  createAccessTokenStore,
  toAccessTokenSnapshot,
  type AccessTokenStore,
} from "./access-token-store"
import { createAuthGeneration, type AuthGeneration } from "./auth-generation"
import { createAuthenticatedApiClient } from "./authenticated-api-client"
import {
  createRefreshCoordinator,
  type RefreshCoordinator,
} from "./refresh-coordinator"

const ADDRESS = MOCK_ADDRESS
const CHAIN_ID = 11155111

let tokenStore: AccessTokenStore
let authGeneration: AuthGeneration
let refreshCoordinator: RefreshCoordinator

beforeEach(() => {
  tokenStore = createAccessTokenStore()
  authGeneration = createAuthGeneration()
  refreshCoordinator = createRefreshCoordinator({ tokenStore, authGeneration })
})

async function signIn(): Promise<void> {
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
    expirationTime: nonce.expirationTime,
  })

  const payload = await verifySiwe({
    message: message,
    signature: await signMockMessage(message),
  })

  tokenStore.set(toAccessTokenSnapshot(payload))
}

/** Simulate an expired access token: the backend releases a new version, the client still keeps the old version. */
function expireAccessToken(): void {
  mockAuthState.accessTokenVersion += 1
}

describe("against the mock backend", () => {
  it("sends the current token and succeeds", async () => {
    await signIn()

    const client = createAuthenticatedApiClient({
      tokenStore,
      refreshCoordinator,
    })

    await expect(
      client.request(PROTECTED_RESOURCE_PATH),
    ).resolves.toMatchObject({ ok: true })
    expect(mockAuthState.requestCounts.refresh).toBe(0)
  })

  it("refreshes once and replays an expired GET with the new token", async () => {
    await signIn()
    expireAccessToken()

    const client = createAuthenticatedApiClient({
      tokenStore,
      refreshCoordinator,
    })

    await expect(
      client.request(PROTECTED_RESOURCE_PATH),
    ).resolves.toMatchObject({ ok: true })

    expect(mockAuthState.requestCounts.refresh).toBe(1)
    expect(mockAuthState.requestCounts.protectedResource).toBe(2)
    expect(tokenStore.get()?.token).toContain(
      `mock-access-token.${mockAuthState.accessTokenVersion}.`,
    )
  })

  it("issues only one refresh for concurrent expired GETs", async () => {
    await signIn()
    expireAccessToken()

    const client = createAuthenticatedApiClient({
      tokenStore,
      refreshCoordinator,
    })

    await Promise.all([
      client.request(PROTECTED_RESOURCE_PATH),
      client.request(PROTECTED_RESOURCE_PATH),
      client.request(PROTECTED_RESOURCE_PATH),
    ])

    expect(mockAuthState.requestCounts.refresh).toBe(1)
    expect(mockAuthState.requestCounts.protectedResource).toBe(6)
  })

  it("does not replay a POST by default", async () => {
    await signIn()
    expireAccessToken()

    const client = createAuthenticatedApiClient({
      tokenStore,
      refreshCoordinator,
    })

    await expect(
      client.request(PROTECTED_RESOURCE_PATH, { method: "POST", body: {} }),
    ).rejects.toMatchObject({ name: "ApiError", status: 401 })

    expect(mockAuthState.requestCounts.refresh).toBe(0)
    expect(mockAuthState.requestCounts.protectedResource).toBe(1)
  })

  it("replays a mutation exactly once when the caller marks it safe", async () => {
    await signIn()
    expireAccessToken()

    const client = createAuthenticatedApiClient({
      tokenStore,
      refreshCoordinator,
    })

    await expect(
      client.request(PROTECTED_RESOURCE_PATH, {
        method: "POST",
        body: {},
        authRetry: "safe",
        idempotencyKey: "key-1",
      }),
    ).resolves.toMatchObject({ ok: true })

    expect(mockAuthState.requestCounts.protectedResource).toBe(2)
  })

  it("stops after one replay when the retry is still unauthorized", async () => {
    await signIn()

    const client = createAuthenticatedApiClient({
      tokenStore,
      refreshCoordinator,
      // Refresh "successful" but the received token still cannot be used.
      request: async (path, options) => {
        expireAccessToken()

        const { apiRequest } = await import("@/lib/api/api-client")

        return apiRequest(path, options)
      },
    })

    await expect(client.request(PROTECTED_RESOURCE_PATH)).rejects.toMatchObject(
      { status: 401 },
    )

    expect(mockAuthState.requestCounts.refresh).toBe(1)
    expect(mockAuthState.requestCounts.protectedResource).toBe(2)
  })

  it("does not refresh when the refresh session is gone", async () => {
    await signIn()
    expireAccessToken()
    mockAuthState.currentRefreshCookieId = null

    const client = createAuthenticatedApiClient({
      tokenStore,
      refreshCoordinator,
    })

    await expect(client.request(PROTECTED_RESOURCE_PATH)).rejects.toMatchObject(
      { status: 401 },
    )

    expect(mockAuthState.requestCounts.refresh).toBe(1)
    expect(mockAuthState.requestCounts.protectedResource).toBe(1)
    expect(tokenStore.get()).toBeNull()
  })
})

describe("refresh boundaries", () => {
  it("never auto-refreshes an auth protocol endpoint", async () => {
    const request = vi.fn().mockRejectedValue(new ApiError(401))
    const refresh = vi.fn()

    const client = createAuthenticatedApiClient({
      tokenStore,
      refreshCoordinator: { refresh, isRefreshing: () => false },
      request,
    })

    for (const endpoint of Object.values(authEndpoints)) {
      await expect(client.request(endpoint)).rejects.toMatchObject({
        status: 401,
      })
    }

    expect(refresh).not.toHaveBeenCalled()
  })

  it("does not refresh a 401 that is not an access-token error", async () => {
    const request = vi
      .fn()
      .mockRejectedValue(new ApiError(401, { code: "INVALID_SIWE_SIGNATURE" }))
    const refresh = vi.fn()

    const client = createAuthenticatedApiClient({
      tokenStore,
      refreshCoordinator: { refresh, isRefreshing: () => false },
      request,
    })

    await expect(client.request("/me/profile")).rejects.toMatchObject({
      status: 401,
    })
    expect(refresh).not.toHaveBeenCalled()
    expect(request).toHaveBeenCalledTimes(1)
  })

  it("does not refresh a 403", async () => {
    const request = vi.fn().mockRejectedValue(new ApiError(403))
    const refresh = vi.fn()

    const client = createAuthenticatedApiClient({
      tokenStore,
      refreshCoordinator: { refresh, isRefreshing: () => false },
      request,
    })

    await expect(client.request("/me/profile")).rejects.toMatchObject({
      status: 403,
    })
    expect(refresh).not.toHaveBeenCalled()
  })

  it("does not replay when logout made the refresh result stale", async () => {
    const request = vi.fn().mockRejectedValue(new ApiError(401))
    const refresh = vi.fn().mockResolvedValue({
      outcome: "authenticated",
      stale: true,
      payload: {},
    })

    const client = createAuthenticatedApiClient({
      tokenStore,
      refreshCoordinator: { refresh, isRefreshing: () => false },
      request,
    })

    await expect(client.request("/me/profile")).rejects.toMatchObject({
      status: 401,
    })
    expect(request).toHaveBeenCalledTimes(1)
  })
})

describe("request construction", () => {
  it("does not mutate the caller options or headers", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true })
    const headers = { "X-Trace": "abc" }
    const options = { method: "GET" as const, headers }

    const client = createAuthenticatedApiClient({
      tokenStore,
      refreshCoordinator,
      request,
    })

    await client.request("/me/profile", options)

    expect(options).toEqual({ method: "GET", headers })
    expect(headers).toEqual({ "X-Trace": "abc" })
    expect(request.mock.calls[0]?.[1]?.headers).toBeInstanceOf(Headers)
  })

  it("preserves the caller abort signal", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true })
    const controller = new AbortController()

    const client = createAuthenticatedApiClient({
      tokenStore,
      refreshCoordinator,
      request,
    })

    await client.request("/me/profile", { signal: controller.signal })

    expect(request.mock.calls[0]?.[1]?.signal).toBe(controller.signal)
  })

  it("propagates an abort raised while waiting for the refresh", async () => {
    await signIn()
    expireAccessToken()

    const controller = new AbortController()
    const client = createAuthenticatedApiClient({
      tokenStore,
      refreshCoordinator,
    })

    const pending = client.request(PROTECTED_RESOURCE_PATH, {
      signal: controller.signal,
    })

    controller.abort()

    await expect(pending).rejects.toThrowError()
  })

  it("sends no Authorization header when no token is stored", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true })

    const client = createAuthenticatedApiClient({
      tokenStore,
      refreshCoordinator,
      request,
    })

    await client.request("/me/profile")

    expect(request.mock.calls[0]?.[1]?.accessToken).toBeUndefined()
  })

  it("reads the newest token for the replay rather than the original one", async () => {
    tokenStore.set({ token: "old-token", expiresAt: Date.now() + 1000 })

    const request = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(401))
      .mockResolvedValueOnce({ ok: true })

    const refresh = vi.fn().mockImplementation(() => {
      tokenStore.set({ token: "new-token", expiresAt: Date.now() + 1000 })

      return Promise.resolve({
        outcome: "authenticated",
        stale: false,
        payload: {},
      })
    })

    const client = createAuthenticatedApiClient({
      tokenStore,
      refreshCoordinator: { refresh, isRefreshing: () => false },
      request,
    })

    await client.request("/me/profile")

    expect(request.mock.calls[0]?.[1]?.accessToken).toBe("old-token")
    expect(request.mock.calls[1]?.[1]?.accessToken).toBe("new-token")
  })
})
