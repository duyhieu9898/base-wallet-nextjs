import { describe, expect, it } from "vitest"

import { EvmWeb3Error } from "@/web3/evm/errors/evm-errors"
import { prepareSendEvmNative } from "./prepare"
const RECIPIENT = "0x086d9feCB2F117369fAbDB884eC6851b36595444"
const SEPOLIA_CHAIN_ID = 11155111

describe("prepareSendEvmNative", () => {
  it("parses a valid amount using native decimals", () => {
    const result = prepareSendEvmNative({
      chainId: SEPOLIA_CHAIN_ID,
      to: RECIPIENT,
      amount: "0.001",
    })

    expect(result.to).toBe(RECIPIENT)
    expect(result.value).toBe(1_000_000_000_000_000n)
  })

  it("rejects zero amount", () => {
    expect(() =>
      prepareSendEvmNative({
        chainId: SEPOLIA_CHAIN_ID,
        to: RECIPIENT,
        amount: "0",
      }),
    ).toThrow(EvmWeb3Error)
  })

  it("rejects invalid recipient", () => {
    expect(() =>
      prepareSendEvmNative({
        chainId: SEPOLIA_CHAIN_ID,
        to: "0xnope",
        amount: "1",
      }),
    ).toThrow()
  })
})
