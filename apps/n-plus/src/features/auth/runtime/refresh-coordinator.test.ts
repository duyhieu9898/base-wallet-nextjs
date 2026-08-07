import { beforeEach, describe, expect, it } from "vitest"

import { ApiError } from "@/lib/api/api-error"
import { requestSiweNonce, verifySiwe } from "@/features/auth/api/auth-api"
import { buildSiweMessage } from "@/features/auth/domain/siwe-message"
import type { UserAuthResponse } from "@/features/auth/domain/auth.schemas"
import {
  MOCK_ADDRESS,
  signMockMessage,
  mockAuthState,
} from "@/mocks/data/auth-session"
import {
  createAccessTokenStore,
  type AccessTokenStore,
} from "./access-token-store"
import { createAuthGeneration, type AuthGeneration } from "./auth-generation"
import { createRefreshCoordinator } from "./refresh-coordinator"

const ADDRESS = MOCK_ADDRESS
const CHAIN_ID = 11155111

function payloadWithToken(token: string): UserAuthResponse {
  return {
    user: { id: "user_1", walletAddress: ADDRESS, memberCode: "NP000001" },
    position: {
      id: "pos-001",
      positionIndex: 0,
      referralCode: "NPLUS-REF1",
      createdAt: new Date().toISOString(),
    },
    accessToken: token,
    expiresIn: 900,
  }
}

let tokenStore: AccessTokenStore
let authGeneration: AuthGeneration

beforeEach(() => {
  tokenStore = createAccessTokenStore()
  authGeneration = createAuthGeneration()
})

describe("single-flight", () => {
  it("collapses concurrent callers into one request", async () => {
    let calls = 0

    const coordinator = createRefreshCoordinator({
      tokenStore,
      authGeneration,
      requestRefresh: async () => {
        calls += 1
        await new Promise((resolve) => setTimeout(resolve, 10))

        return payloadWithToken("token-1")
      },
    })

    const results = await Promise.all([
      coordinator.refresh(),
      coordinator.refresh(),
      coordinator.refresh(),
    ])

    expect(calls).toBe(1)
    expect(results[0]).toBe(results[1])
    expect(results[1]).toBe(results[2])
    expect(tokenStore.get()?.token).toBe("token-1")
  })

  it("releases every waiter when the refresh fails", async () => {
    const coordinator = createRefreshCoordinator({
      tokenStore,
      authGeneration,
      requestRefresh: async () => {
        await new Promise((resolve) => setTimeout(resolve, 5))

        throw new ApiError(500)
      },
    })

    const results = await Promise.all([
      coordinator.refresh(),
      coordinator.refresh(),
    ])

    expect(results.every((result) => result.outcome === "unavailable")).toBe(
      true,
    )
    expect(coordinator.isRefreshing()).toBe(false)
  })

  it("allows a new refresh after a previous one failed", async () => {
    let calls = 0

    const coordinator = createRefreshCoordinator({
      tokenStore,
      authGeneration,
      requestRefresh: async () => {
        calls += 1

        if (calls === 1) {
          throw new ApiError(500)
        }

        return payloadWithToken("token-2")
      },
    })

    expect((await coordinator.refresh()).outcome).toBe("unavailable")
    expect((await coordinator.refresh()).outcome).toBe("authenticated")
    expect(calls).toBe(2)
  })

  it("starts a fresh request once the previous one settled", async () => {
    let calls = 0

    const coordinator = createRefreshCoordinator({
      tokenStore,
      authGeneration,
      requestRefresh: async () => {
        calls += 1

        return payloadWithToken(`token-${calls}`)
      },
    })

    await coordinator.refresh()
    await coordinator.refresh()

    expect(calls).toBe(2)
    expect(tokenStore.get()?.token).toBe("token-2")
  })
})

describe("terminal classification", () => {
  it("treats a 401 as terminal unauthenticated and clears the token", async () => {
    tokenStore.set({ token: "old-token", expiresAt: Date.now() + 1000 })

    const coordinator = createRefreshCoordinator({
      tokenStore,
      authGeneration,
      requestRefresh: () => Promise.reject(new ApiError(401)),
    })

    const result = await coordinator.refresh()

    expect(result.outcome).toBe("unauthenticated")
    expect(tokenStore.get()).toBeNull()
  })

  it("keeps the token when the backend is merely unavailable", async () => {
    tokenStore.set({ token: "old-token", expiresAt: Date.now() + 1000 })

    const coordinator = createRefreshCoordinator({
      tokenStore,
      authGeneration,
      requestRefresh: () => Promise.reject(new ApiError(503)),
    })

    const result = await coordinator.refresh()

    expect(result.outcome).toBe("unavailable")
    expect(tokenStore.get()?.token).toBe("old-token")
  })

  it("does not write a token for a malformed payload", async () => {
    const coordinator = createRefreshCoordinator({
      tokenStore,
      authGeneration,
      requestRefresh: () =>
        Promise.reject(
          Object.assign(new Error("bad payload"), {
            name: "AuthError",
          }),
        ),
    })

    const result = await coordinator.refresh()

    expect(result.outcome).toBe("unavailable")
    expect(tokenStore.get()).toBeNull()
  })
})

describe("operation ownership", () => {
  it("does not commit a refresh that finished after logout", async () => {
    const coordinator = createRefreshCoordinator({
      tokenStore,
      authGeneration,
      requestRefresh: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))

        return payloadWithToken("late-token")
      },
    })

    const pending = coordinator.refresh()

    // Logout occurs while refresh is in progress.
    authGeneration.next()
    tokenStore.clear()

    const result = await pending

    expect(result.stale).toBe(true)
    expect(tokenStore.get()).toBeNull()
  })

  it("does not overwrite a session created by a newer login", async () => {
    const coordinator = createRefreshCoordinator({
      tokenStore,
      authGeneration,
      requestRefresh: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))

        return payloadWithToken("stale-refresh-token")
      },
    })

    const pending = coordinator.refresh()

    authGeneration.next()
    tokenStore.set({ token: "fresh-login-token", expiresAt: Date.now() + 1000 })

    await pending

    expect(tokenStore.get()?.token).toBe("fresh-login-token")
  })

  it("does not clear a newer token when a stale refresh is rejected", async () => {
    const coordinator = createRefreshCoordinator({
      tokenStore,
      authGeneration,
      requestRefresh: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))

        throw new ApiError(401)
      },
    })

    const pending = coordinator.refresh()

    authGeneration.next()
    tokenStore.set({ token: "fresh-login-token", expiresAt: Date.now() + 1000 })

    const result = await pending

    expect(result.stale).toBe(true)
    expect(tokenStore.get()?.token).toBe("fresh-login-token")
  })
})

describe("against the mock backend", () => {
  async function signIn() {
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

    return verifySiwe({
      message: message,
      signature: await signMockMessage(message),
    })
  }

  it("issues exactly one backend refresh for concurrent callers", async () => {
    await signIn()

    const coordinator = createRefreshCoordinator({ tokenStore, authGeneration })

    await Promise.all([
      coordinator.refresh(),
      coordinator.refresh(),
      coordinator.refresh(),
    ])

    expect(mockAuthState.requestCounts.refresh).toBe(1)
    expect(tokenStore.get()?.token).toContain("mock-access-token")
  })

  it("reports unauthenticated when no refresh session exists", async () => {
    const coordinator = createRefreshCoordinator({ tokenStore, authGeneration })

    expect((await coordinator.refresh()).outcome).toBe("unauthenticated")
  })
})
