import { describe, expect, it } from "vitest"

import { EvmWeb3Error } from "@/web3/evm/errors/evm-errors"
import {
  prepareApproveEvmToken,
  prepareSendEvmNative,
  prepareSendEvmToken,
} from "@/web3/evm/adapters/evm-transaction.adapter"

const RECIPIENT = "0x086d9feCB2F117369fAbDB884eC6851b36595444"
const SEPOLIA_CHAIN_ID = 11155111
const USDC_SEPOLIA: `0x${string}` = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"

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
