import { describe, expect, it } from "vitest"

import {
  authenticatedSessionPayloadSchema,
  siweNonceResponseSchema,
} from "./auth.schemas"

const ADDRESS = "0x086d9feCB2F117369fAbDB884eC6851b36595444"

const validAuthenticated = {
  authenticated: true,
  user: { id: "user_1", walletAddress: ADDRESS, roles: ["user"] },
  accessToken: "access-token-value",
  accessTokenExpiresAt: "2026-08-04T10:00:00.000Z",
}

describe("authenticated session payload schema", () => {
  it("accepts a well-formed payload", () => {
    expect(authenticatedSessionPayloadSchema.parse(validAuthenticated)).toEqual(
      validAuthenticated,
    )
  })

  it("rejects an authenticated payload without an access token", () => {
    const withoutToken = {
      authenticated: validAuthenticated.authenticated,
      user: validAuthenticated.user,
      accessTokenExpiresAt: validAuthenticated.accessTokenExpiresAt,
    }

    expect(
      authenticatedSessionPayloadSchema.safeParse(withoutToken).success,
    ).toBe(false)
  })

  it("rejects an invalid wallet address", () => {
    expect(
      authenticatedSessionPayloadSchema.safeParse({
        ...validAuthenticated,
        user: { ...validAuthenticated.user, walletAddress: "0x123" },
      }).success,
    ).toBe(false)
  })

  it("rejects an unparsable expiry timestamp", () => {
    expect(
      authenticatedSessionPayloadSchema.safeParse({
        ...validAuthenticated,
        accessTokenExpiresAt: "not-a-date",
      }).success,
    ).toBe(false)
  })

  it("rejects a malformed payload", () => {
    expect(
      authenticatedSessionPayloadSchema.safeParse({ user: {} }).success,
    ).toBe(false)
  })
})

describe("siwe nonce response schema", () => {
  const issuedAt = "2026-08-04T10:00:00.000Z"

  it("accepts a nonce that expires after it was issued", () => {
    const response = {
      nonce: "abc123",
      issuedAt,
      expirationTime: "2026-08-04T10:05:00.000Z",
    }

    expect(siweNonceResponseSchema.parse(response)).toEqual(response)
  })

  it("rejects an empty nonce", () => {
    expect(
      siweNonceResponseSchema.safeParse({
        nonce: "",
        issuedAt,
        expirationTime: "2026-08-04T10:05:00.000Z",
      }).success,
    ).toBe(false)
  })

  it("rejects an expiry that is not after the issued time", () => {
    expect(
      siweNonceResponseSchema.safeParse({
        nonce: "abc123",
        issuedAt,
        expirationTime: issuedAt,
      }).success,
    ).toBe(false)
  })

  it("rejects unparsable timestamps", () => {
    expect(
      siweNonceResponseSchema.safeParse({
        nonce: "abc123",
        issuedAt: "yesterday",
        expirationTime: "tomorrow",
      }).success,
    ).toBe(false)
  })
})
