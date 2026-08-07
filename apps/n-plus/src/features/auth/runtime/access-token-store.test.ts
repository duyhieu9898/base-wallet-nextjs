import { describe, expect, it } from "vitest"

import {
  createAccessTokenStore,
  toAccessTokenSnapshot,
} from "./access-token-store"

describe("createAccessTokenStore", () => {
  it("rejects an empty token instead of storing it", () => {
    const store = createAccessTokenStore()

    expect(() => store.set({ token: "", expiresAt: 1000 })).toThrow()
    expect(store.get()).toBeNull()
  })

  it("gives each instance its own isolated state", () => {
    const first = createAccessTokenStore()
    const second = createAccessTokenStore()

    first.set({ token: "token-1", expiresAt: 1000 })

    expect(second.get()).toBeNull()
  })

  it("does not leak the token into any browser storage", () => {
    const store = createAccessTokenStore()

    store.set({ token: "secret-token", expiresAt: 1000 })

    expect(JSON.stringify(window.localStorage)).not.toContain("secret-token")
    expect(JSON.stringify(window.sessionStorage)).not.toContain("secret-token")
    expect(document.cookie).not.toContain("secret-token")
  })

  it("returns a copy so callers cannot mutate stored state", () => {
    const store = createAccessTokenStore()
    const input = { token: "token-1", expiresAt: 1000 }

    store.set(input)
    input.token = "mutated"

    expect(store.get()?.token).toBe("token-1")
  })
})

describe("toAccessTokenSnapshot", () => {
  it("converts expiresIn seconds to epoch milliseconds in future", () => {
    const before = Date.now()
    const snapshot = toAccessTokenSnapshot({
      accessToken: "token-1",
      expiresIn: 900,
    })
    const after = Date.now()

    expect(snapshot.token).toBe("token-1")
    expect(snapshot.expiresAt).toBeGreaterThanOrEqual(before + 900 * 1000)
    expect(snapshot.expiresAt).toBeLessThanOrEqual(after + 900 * 1000)
  })
})
