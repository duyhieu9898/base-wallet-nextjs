import { describe, expect, it } from "vitest"

import {
  siweNonceResponseSchema,
  siweVerifyResponseSchema,
  userAuthResponseSchema,
} from "./auth.schemas"

const ADDRESS = "0x086d9feCB2F117369fAbDB884eC6851b36595444"

const validAuthenticated = {
  status: "authenticated" as const,
  user: { id: "user_1", walletAddress: ADDRESS, memberCode: "NP000001" },
  position: {
    id: "pos-001",
    positionIndex: 0,
    referralCode: "NPLUS-REF1",
    createdAt: "2026-08-04T10:00:00.000Z",
  },
  accessToken: "access-token-value",
  expiresIn: 900,
}

describe("siwe verify response schema", () => {
  it("accepts a well-formed authenticated payload", () => {
    expect(siweVerifyResponseSchema.parse(validAuthenticated)).toEqual(
      validAuthenticated,
    )
  })

  it("accepts an authenticated payload with position omitted or null", () => {
    const { position: _position, ...withoutPosition } = validAuthenticated

    expect(siweVerifyResponseSchema.parse(withoutPosition)).toEqual(
      withoutPosition,
    )
    expect(
      siweVerifyResponseSchema.parse({ ...validAuthenticated, position: null }),
    ).toEqual({ ...validAuthenticated, position: null })
  })

  it("accepts a well-formed registrationRequired payload", () => {
    const registrationPayload = {
      status: "registrationRequired" as const,
      walletAddress: ADDRESS,
      registrationTicket: "ticket-123",
    }

    expect(siweVerifyResponseSchema.parse(registrationPayload)).toEqual(
      registrationPayload,
    )
  })

  it("rejects an authenticated payload without an access token", () => {
    const { accessToken: _accessToken, ...withoutToken } = validAuthenticated

    expect(siweVerifyResponseSchema.safeParse(withoutToken).success).toBe(false)
  })

  it("rejects an invalid wallet address", () => {
    expect(
      siweVerifyResponseSchema.safeParse({
        ...validAuthenticated,
        user: { ...validAuthenticated.user, walletAddress: "0x123" },
      }).success,
    ).toBe(false)
  })
})

describe("user auth response schema", () => {
  it("accepts a well-formed user auth response", () => {
    const payload = {
      user: { id: "user_1", walletAddress: ADDRESS, memberCode: "NP000001" },
      position: {
        id: "pos-001",
        positionIndex: 0,
        referralCode: "NPLUS-REF1",
        createdAt: "2026-08-04T10:00:00.000Z",
      },
      accessToken: "access-token-value",
      expiresIn: 900,
    }

    expect(userAuthResponseSchema.parse(payload)).toEqual(payload)
  })
})

describe("siwe nonce response schema", () => {
  const issuedAt = "2026-08-04T10:00:00.000Z"

  it("accepts a nonce that expires after it was issued", () => {
    const response = {
      nonce: "abc123",
      issuedAt,
      expirationTime: "2026-08-04T10:05:00.000Z",
      domain: "localhost:3000",
      uri: "http://localhost:3000",
    }

    expect(siweNonceResponseSchema.parse(response)).toEqual(response)
  })

  it("rejects an empty nonce", () => {
    expect(
      siweNonceResponseSchema.safeParse({
        nonce: "",
        issuedAt,
        expirationTime: "2026-08-04T10:05:00.000Z",
        domain: "localhost:3000",
        uri: "http://localhost:3000",
      }).success,
    ).toBe(false)
  })

  it("rejects an expiry that is not after the issued time", () => {
    expect(
      siweNonceResponseSchema.safeParse({
        nonce: "abc123",
        issuedAt,
        expirationTime: issuedAt,
        domain: "localhost:3000",
        uri: "http://localhost:3000",
      }).success,
    ).toBe(false)
  })

  it("rejects unparsable timestamps", () => {
    expect(
      siweNonceResponseSchema.safeParse({
        nonce: "abc123",
        issuedAt: "yesterday",
        expirationTime: "tomorrow",
        domain: "localhost:3000",
        uri: "http://localhost:3000",
      }).success,
    ).toBe(false)
  })
})
