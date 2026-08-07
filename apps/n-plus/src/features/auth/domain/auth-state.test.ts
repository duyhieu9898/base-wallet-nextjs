import { describe, expect, it } from "vitest"
import type { Address } from "viem"

import { createAuthError } from "./auth-error"
import type { AuthUser, UserPosition } from "./auth.schemas"
import { authReducer, type AuthEvent, type AuthState } from "./auth-state"

const ADDRESS = "0x086d9feCB2F117369fAbDB884eC6851b36595444" as Address

const user: AuthUser = {
  id: "user_1",
  walletAddress: ADDRESS,
  memberCode: "NP000001",
}

const position: UserPosition = {
  id: "pos-001",
  positionIndex: 0,
  referralCode: "NPLUS-REF1",
  createdAt: "2026-08-04T10:00:00.000Z",
}

const EXPIRES_IN = 900

const established: AuthEvent = {
  type: "session-established",
  user,
  position,
  expiresIn: EXPIRES_IN,
}

const unverifiable: AuthEvent = {
  type: "session-unverifiable",
  error: createAuthError("REFRESH_FAILED", "backend unreachable"),
}

const bootstrapping: AuthState = { status: "bootstrapping" }
const unauthenticated: AuthState = { status: "unauthenticated" }
const authenticating: AuthState = {
  status: "authenticating",
  walletAddress: ADDRESS,
}
const authenticated: AuthState = {
  status: "authenticated",
  user,
  position,
  expiresIn: EXPIRES_IN,
}
const unavailable: AuthState = {
  status: "unavailable",
  error: createAuthError("AUTH_UNAVAILABLE", "disabled"),
}

describe("from bootstrapping", () => {
  it("becomes authenticated when the backend confirms a session", () => {
    expect(authReducer(bootstrapping, established)).toEqual(authenticated)
  })

  it("becomes unauthenticated when the backend rejects the session", () => {
    expect(authReducer(bootstrapping, { type: "session-rejected" })).toEqual(
      unauthenticated,
    )
  })

  it("becomes unavailable — not unauthenticated — when the backend is unreachable", () => {
    expect(authReducer(bootstrapping, unverifiable).status).toBe("unavailable")
  })

  it("refuses to start a login before the session is known", () => {
    expect(
      authReducer(bootstrapping, {
        type: "login-started",
        walletAddress: ADDRESS,
      }),
    ).toBe(bootstrapping)
  })
})

describe("from unauthenticated", () => {
  it("starts a login", () => {
    expect(
      authReducer(unauthenticated, {
        type: "login-started",
        walletAddress: ADDRESS,
      }),
    ).toEqual(authenticating)
  })

  it("accepts a session restored by a background refresh", () => {
    expect(authReducer(unauthenticated, established)).toEqual(authenticated)
  })

  it("goes back to bootstrapping on retry", () => {
    expect(authReducer(unauthenticated, { type: "bootstrap-started" })).toEqual(
      bootstrapping,
    )
  })
})

describe("from authenticating", () => {
  it("becomes authenticated once verify succeeds", () => {
    expect(authReducer(authenticating, established)).toEqual(authenticated)
  })

  it("returns to unauthenticated when the login fails", () => {
    expect(authReducer(authenticating, { type: "login-failed" })).toEqual(
      unauthenticated,
    )
  })

  it("returns to unauthenticated when the user logs out mid-login", () => {
    expect(authReducer(authenticating, { type: "logged-out" })).toEqual(
      unauthenticated,
    )
  })

  it("does not let a background refresh rejection cancel the login in progress", () => {
    expect(authReducer(authenticating, { type: "session-rejected" })).toBe(
      authenticating,
    )
  })

  it("does not let a backend blip cancel the login in progress", () => {
    expect(authReducer(authenticating, unverifiable)).toBe(authenticating)
  })
})

describe("from authenticated", () => {
  it("updates the expiry when the token is rotated", () => {
    const rotated = authReducer(authenticated, {
      type: "session-established",
      user,
      position,
      expiresIn: 1800,
    })

    expect(rotated).toEqual({
      status: "authenticated",
      user,
      position,
      expiresIn: 1800,
    })
  })

  it("becomes unauthenticated when the refresh session is rejected", () => {
    expect(authReducer(authenticated, { type: "session-rejected" })).toEqual(
      unauthenticated,
    )
  })

  it("becomes unauthenticated on logout", () => {
    expect(authReducer(authenticated, { type: "logged-out" })).toEqual(
      unauthenticated,
    )
  })

  it("survives a backend blip — one unreachable refresh must not sign the user out", () => {
    expect(authReducer(authenticated, unverifiable)).toBe(authenticated)
  })

  it("refuses to start a login over an existing session", () => {
    expect(
      authReducer(authenticated, {
        type: "login-started",
        walletAddress: ADDRESS,
      }),
    ).toBe(authenticated)
  })
})

describe("from unavailable", () => {
  it("retries into bootstrapping", () => {
    expect(authReducer(unavailable, { type: "bootstrap-started" })).toEqual(
      bootstrapping,
    )
  })

  it("recovers straight to authenticated when a retry succeeds", () => {
    expect(authReducer(unavailable, established)).toEqual(authenticated)
  })

  it("refuses to start a login while the backend is unreachable", () => {
    expect(
      authReducer(unavailable, {
        type: "login-started",
        walletAddress: ADDRESS,
      }),
    ).toBe(unavailable)
  })
})
