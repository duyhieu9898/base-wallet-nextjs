import { describe, expect, it } from "vitest"

import { EvmWeb3Error } from "../../errors/evm-errors"
import { prepareApproveEvmToken } from "./prepare"
const RECIPIENT = "0x086d9feCB2F117369fAbDB884eC6851b36595444"
const SEPOLIA_CHAIN_ID = 11155111
const USDC_SEPOLIA: `0x${string}` = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"

describe("prepareApproveEvmToken", () => {
  it("parses valid approval amount using token decimals (6 for USDC)", () => {
    const result = prepareApproveEvmToken({
      chainId: SEPOLIA_CHAIN_ID,
      tokenAddress: USDC_SEPOLIA,
      spender: RECIPIENT,
      amount: "100.5",
    })

    expect(result.functionName).toBe("approve")
    expect(result.args[0]).toBe(RECIPIENT)
    expect(result.args[1]).toBe(100_500_000n)
  })

  it("allows zero approval amount", () => {
    const result = prepareApproveEvmToken({
      chainId: SEPOLIA_CHAIN_ID,
      tokenAddress: USDC_SEPOLIA,
      spender: RECIPIENT,
      amount: "0",
    })

    expect(result.args[1]).toBe(0n)
  })

  it("rejects negative approval amount", () => {
    expect(() =>
      prepareApproveEvmToken({
        chainId: SEPOLIA_CHAIN_ID,
        tokenAddress: USDC_SEPOLIA,
        spender: RECIPIENT,
        amount: "-5",
      }),
    ).toThrow(EvmWeb3Error)
  })

  it("rejects invalid spender address", () => {
    expect(() =>
      prepareApproveEvmToken({
        chainId: SEPOLIA_CHAIN_ID,
        tokenAddress: USDC_SEPOLIA,
        spender: "invalid-spender",
        amount: "10",
      }),
    ).toThrow(EvmWeb3Error)
  })
})
