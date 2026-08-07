import { describe, expect, it } from "vitest"
import { mainnet, sepolia } from "viem/chains"

import { resolveAdminChain } from "./web3.config"

describe("resolveAdminChain", () => {
  it("links to mainnet in a production deployment", () => {
    expect(resolveAdminChain("production")).toBe(mainnet)
  })

  it("links to testnet in a development deployment", () => {
    expect(resolveAdminChain("development")).toBe(sepolia)
  })

  it("falls back to testnet when the variable is unset or blank", () => {
    expect(resolveAdminChain(undefined)).toBe(sepolia)
    expect(resolveAdminChain("")).toBe(sepolia)
    expect(resolveAdminChain("   ")).toBe(sepolia)
  })

  it("throws on a value that is set but unrecognized", () => {
    // A typo resolving to testnet would point a production console at an
    // explorer where none of its records exist.
    expect(() => resolveAdminChain("prod")).toThrow(/is not recognized/)
    expect(() => resolveAdminChain("staging")).toThrow()
    expect(() => resolveAdminChain("Production")).toThrow()
  })
})
