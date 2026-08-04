import type { Address } from "viem"
import { describe, expect, it } from "vitest"

import { EvmWeb3Error } from "@/web3/evm/errors"
import { toAddressKey } from "@/web3/evm/evm-address"

const CHECKSUMMED: Address = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"

describe("toAddressKey", () => {
  it("standardize on lowercase", () => {
    expect(toAddressKey(CHECKSUMMED)).toBe(CHECKSUMMED.toLowerCase())
  })

  it("idempotent with lowercased address", () => {
    const lowered = CHECKSUMMED.toLowerCase() as Address
    expect(toAddressKey(lowered)).toBe(lowered)
  })

  it("throws EvmWeb3Error with code INVALID_ADDRESS instead of normal Error", () => {
    let caught: unknown
    try {
      toAddressKey("0xinvalid" as Address)
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(EvmWeb3Error)
    expect((caught as EvmWeb3Error).code).toBe("INVALID_ADDRESS")
  })
})
