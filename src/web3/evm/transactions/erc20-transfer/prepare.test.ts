import { describe, expect, it } from "vitest"

import { EvmWeb3Error } from "@/web3/evm/errors/evm-errors"
import { prepareSendEvmToken } from "./prepare"
const RECIPIENT = "0x086d9feCB2F117369fAbDB884eC6851b36595444"
const SEPOLIA_CHAIN_ID = 11155111
const USDC_SEPOLIA: `0x${string}` = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"

describe("prepareSendEvmToken", () => {
  it("parses amount using token decimals (6 for USDC)", () => {
    const result = prepareSendEvmToken({
      chainId: SEPOLIA_CHAIN_ID,
      tokenAddress: USDC_SEPOLIA,
      to: RECIPIENT,
      amount: "1.5",
    })

    expect(result.functionName).toBe("transfer")
    expect(result.args[0]).toBe(RECIPIENT)
    expect(result.args[1]).toBe(1_500_000n)
  })

  it("rejects negative amount", () => {
    expect(() =>
      prepareSendEvmToken({
        chainId: SEPOLIA_CHAIN_ID,
        tokenAddress: USDC_SEPOLIA,
        to: RECIPIENT,
        amount: "-1",
      }),
    ).toThrow(EvmWeb3Error)
  })
})
