import { describe, expect, it } from "vitest"

import {
  buildTokenBalanceContracts,
  mapTokenBalanceResults,
  normalizeNativeBalance,
  normalizeTokenBalance,
  normalizeTokenAddressList,
} from "@/web3/evm/reads/balances/evm-balance.adapter"
import {
  getEvmNetworkByChainId,
  getEvmToken,
} from "@/web3/evm/chain/registry/evm-registry.adapter"
import { EvmWeb3Error } from "@/web3/evm/errors/evm-errors"

const OWNER: `0x${string}` = "0x086d9feCB2F117369fAbDB884eC6851b36595444"
const USDC_SEPOLIA: `0x${string}` = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"

describe("normalizeNativeBalance", () => {
  it("formats ETH with 18 decimals and uses native asset id", () => {
    const network = getEvmNetworkByChainId(11155111)
    const balance = normalizeNativeBalance(1_000_000_000_000_000_000n, network)

    expect(balance.decimals).toBe(18)
    expect(balance.formattedAmount).toBe("1")
    expect(balance.symbol).toBe("ETH")
    expect(balance.assetId).toBe("native")
    expect(balance.assetType).toBe("native")
  })
})

describe("normalizeTokenBalance", () => {
  it("formats USDC with 6 decimals and uses lowercase token address as assetId", () => {
    const network = getEvmNetworkByChainId(11155111)
    const token = getEvmToken(11155111, USDC_SEPOLIA)
    const balance = normalizeTokenBalance(1_000_000n, network, token)

    expect(balance.decimals).toBe(6)
    expect(balance.formattedAmount).toBe("1")
    expect(balance.symbol).toBe("USDC")
    expect(balance.assetType).toBe("erc20")
    expect(balance.assetId).toBe(token.address.toLowerCase())
    expect(balance.address).toBe(token.address.toLowerCase())
  })

  it("keeps raw amount as bigint", () => {
    const network = getEvmNetworkByChainId(11155111)
    const token = getEvmToken(11155111, USDC_SEPOLIA)
    const balance = normalizeTokenBalance(2_500_000n, network, token)

    expect(balance.rawAmount).toBe(2_500_000n)
    expect(balance.formattedAmount).toBe("2.5")
  })
})

describe("buildTokenBalanceContracts", () => {
  it("builds balanceOf contract calls for given tokens", () => {
    const token = getEvmToken(11155111, USDC_SEPOLIA)
    const contracts = buildTokenBalanceContracts({
      tokens: [token],
      walletAddress: OWNER,
    })

    expect(contracts).toHaveLength(1)
    expect(contracts[0].address).toBe(token.address)
    expect(contracts[0].functionName).toBe("balanceOf")
    expect(contracts[0].args).toEqual([OWNER])
  })
})

describe("normalizeTokenAddressList", () => {
  it("resolves valid token addresses through registry", () => {
    const result = normalizeTokenAddressList(11155111, [USDC_SEPOLIA])
    expect(result).toHaveLength(1)
    expect(result[0].symbol).toBe("USDC")
  })

  it("deduplicates addresses with different casing", () => {
    const result = normalizeTokenAddressList(11155111, [
      USDC_SEPOLIA,
      USDC_SEPOLIA.toLowerCase() as `0x${string}`,
    ])
    expect(result).toHaveLength(1)
  })

  it("keeps first occurrence order", () => {
    // Only one token on sepolia, so order is trivially preserved
    const result = normalizeTokenAddressList(11155111, [USDC_SEPOLIA])
    expect(result[0].symbol).toBe("USDC")
  })

  it("rejects invalid address format", () => {
    expect(() =>
      normalizeTokenAddressList(11155111, ["0xinvalid" as `0x${string}`]),
    ).toThrow()
  })

  it("rejects unknown token address", () => {
    expect(() =>
      normalizeTokenAddressList(11155111, [
        "0x0000000000000000000000000000000000000001",
      ]),
    ).toThrow()
  })
})

describe("mapTokenBalanceResults", () => {
  it("maps successful multicall results correctly", () => {
    const network = getEvmNetworkByChainId(11155111)
    const token = getEvmToken(11155111, USDC_SEPOLIA)
    const results = mapTokenBalanceResults([token], network, [
      { status: "success", result: 5_000_000n },
    ])

    expect(results).toHaveLength(1)
    expect(results[0].status).toBe("success")
    if (results[0].status === "success") {
      expect(results[0].balance.formattedAmount).toBe("5")
      expect(results[0].tokenAddress).toBe(token.address.toLowerCase())
    }
  })

  it("throws CONTRACT_READ_FAILED when the result number does not match the token number", () => {
    const network = getEvmNetworkByChainId(11155111)
    const token = getEvmToken(11155111, USDC_SEPOLIA)

    let caught: unknown
    try {
      mapTokenBalanceResults([token, token], network, [
        { status: "success", result: 1n },
      ])
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(EvmWeb3Error)
    expect((caught as EvmWeb3Error).code).toBe("CONTRACT_READ_FAILED")
  })

  it("handles partial multicall failure gracefully", () => {
    const network = getEvmNetworkByChainId(11155111)
    const token = getEvmToken(11155111, USDC_SEPOLIA)
    const results = mapTokenBalanceResults([token], network, [
      { status: "failure", error: new Error("Contract call reverted") },
    ])

    expect(results).toHaveLength(1)
    expect(results[0].status).toBe("failure")
    if (results[0].status === "failure") {
      // Raw errors are wrapped, RPC messages are not sent to the UI
      expect(results[0].error).toBeInstanceOf(EvmWeb3Error)
      expect(results[0].error.code).toBe("CONTRACT_READ_FAILED")
      expect(results[0].error.message).not.toContain("Contract call reverted")
      expect((results[0].error.cause as Error).message).toContain(
        "Contract call reverted",
      )
    }
  })
})
