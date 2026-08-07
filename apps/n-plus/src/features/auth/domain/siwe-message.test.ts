import { describe, expect, it } from "vitest"
import type { Address } from "viem"

import { buildSiweMessage } from "./siwe-message"

const ADDRESS = "0x086d9feCB2F117369fAbDB884eC6851b36595444" as Address

const baseInput = {
  domain: "app.example.com",
  address: ADDRESS,
  uri: "https://app.example.com",
  chainId: 11155111,
  nonce: "nonce-value",
  issuedAt: "2026-08-04T10:00:00.000Z",
  expirationTime: "2026-08-04T10:05:00.000Z",
  statement: "Sign in.",
}

describe("buildSiweMessage", () => {
  it("builds an EIP-4361 message", () => {
    expect(buildSiweMessage(baseInput)).toBe(
      [
        "app.example.com wants you to sign in with your Ethereum account:",
        ADDRESS,
        "",
        "Sign in.",
        "",
        "URI: https://app.example.com",
        "Version: 1",
        "Chain ID: 11155111",
        "Nonce: nonce-value",
        "Issued At: 2026-08-04T10:00:00.000Z",
        "Expiration Time: 2026-08-04T10:05:00.000Z",
      ].join("\n"),
    )
  })

  it("uses the checksummed address even when given a lowercase one", () => {
    const message = buildSiweMessage({
      ...baseInput,
      address: ADDRESS.toLowerCase() as Address,
    })

    expect(message.split("\n")[1]).toBe(ADDRESS)
  })

  it("omits the statement block when no statement is given", () => {
    const message = buildSiweMessage({ ...baseInput, statement: undefined })

    expect(message).not.toContain("Sign in.")
    expect(message.split("\n")[3]).toBe("URI: https://app.example.com")
  })

  it("omits the expiration line when no expiry is given", () => {
    const message = buildSiweMessage({
      ...baseInput,
      expirationTime: undefined,
    })

    expect(message).not.toContain("Expiration Time")
  })

  it("rejects a multi-line statement that could forge extra fields", () => {
    expect(() =>
      buildSiweMessage({
        ...baseInput,
        statement: "Sign in.\nChain ID: 1",
      }),
    ).toThrowError(expect.objectContaining({ name: "AuthError" }))
  })

  it("rejects an empty nonce", () => {
    expect(() => buildSiweMessage({ ...baseInput, nonce: " " })).toThrowError(
      expect.objectContaining({ code: "INVALID_AUTH_RESPONSE" }),
    )
  })

  it("rejects a non-positive chain id", () => {
    expect(() => buildSiweMessage({ ...baseInput, chainId: 0 })).toThrowError(
      expect.objectContaining({ code: "AUTH_UNAVAILABLE" }),
    )
  })

  it("rejects an unparsable issued-at timestamp", () => {
    expect(() =>
      buildSiweMessage({ ...baseInput, issuedAt: "yesterday" }),
    ).toThrowError(expect.objectContaining({ code: "INVALID_AUTH_RESPONSE" }))
  })
})
