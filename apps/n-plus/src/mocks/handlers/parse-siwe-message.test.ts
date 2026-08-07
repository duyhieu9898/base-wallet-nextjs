import { describe, expect, it } from "vitest"
import type { Address } from "viem"

import { buildSiweMessage } from "@/features/auth/domain/siwe-message"
import { parseSiweMessage } from "./parse-siwe-message"

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

describe("parseSiweMessage", () => {
  it("round-trips a built message", () => {
    expect(parseSiweMessage(buildSiweMessage(baseInput))).toEqual({
      domain: "app.example.com",
      address: ADDRESS,
      uri: "https://app.example.com",
      version: "1",
      chainId: 11155111,
      nonce: "nonce-value",
      issuedAt: "2026-08-04T10:00:00.000Z",
      expirationTime: "2026-08-04T10:05:00.000Z",
    })
  })

  it("returns null expiration when the message has none", () => {
    const parsed = parseSiweMessage(
      buildSiweMessage({ ...baseInput, expirationTime: undefined }),
    )

    expect(parsed?.expirationTime).toBeNull()
  })

  it("returns null for a message that is not SIWE", () => {
    expect(parseSiweMessage("hello world")).toBeNull()
  })

  it("returns null when required fields are missing", () => {
    const truncated = buildSiweMessage(baseInput)
      .split("\n")
      .filter((line) => !line.startsWith("Nonce: "))
      .join("\n")

    expect(parseSiweMessage(truncated)).toBeNull()
  })
})
