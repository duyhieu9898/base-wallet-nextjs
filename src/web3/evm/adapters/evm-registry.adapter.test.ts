import { describe, expect, it } from "vitest"

import { createExplorerConfig } from "@/web3/core/registry.selectors"
import {
  findEvmNetworkByChainId,
  findEvmToken,
  getAddressExplorerUrl,
  getAllEvmNetworks,
  getEvmNetworkByChainId,
  getEvmNetworkByKey,
  getEvmToken,
  getEvmTokensForChain,
  getTransactionExplorerUrl,
} from "@/web3/evm/adapters/evm-registry.adapter"
import { EVM_NETWORKS } from "@/web3/evm/registry/evm-network.registry"

const USDC_SEPOLIA: `0x${string}` = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"

describe("evm-registry.adapter", () => {
  describe("getEvmNetworkByChainId & getEvmNetworkByKey", () => {
    it("resolves known chain ids", () => {
      expect(getEvmNetworkByChainId(11155111).key).toBe("ethereum-sepolia")
      expect(getEvmNetworkByChainId(1).key).toBe("ethereum-mainnet")
    })

    it("resolves known string keys", () => {
      expect(getEvmNetworkByKey("ethereum-sepolia").chain.id).toBe(11155111)
      expect(getEvmNetworkByKey("ethereum-mainnet").chain.id).toBe(1)
    })

    it("throws for unknown chain id", () => {
      expect(() => getEvmNetworkByChainId(999999)).toThrow()
    })

    it("throws for unknown string key", () => {
      expect(() => getEvmNetworkByKey("unknown-key")).toThrow()
    })
  })

  it("getAllEvmNetworks returns all entries", () => {
    expect(getAllEvmNetworks()).toHaveLength(2)
  })

  it("chain ids are unique", () => {
    const ids = getAllEvmNetworks().map((network) => network.chain.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("Lookup map always matches the real chain.id (no chain id stored in two places)", () => {
    for (const network of getAllEvmNetworks()) {
      expect(EVM_NETWORKS[network.chain.id]).toBe(network)
      expect(getEvmNetworkByChainId(network.chain.id)).toBe(network)
      expect(findEvmNetworkByChainId(network.chain.id)).toBe(network)
    }
    expect(Object.keys(EVM_NETWORKS)).toHaveLength(getAllEvmNetworks().length)
  })

  it("token list keeps referential stability between calls", () => {
    expect(getEvmTokensForChain(11155111)).toBe(getEvmTokensForChain(11155111))
    expect(getAllEvmNetworks()).toBe(getAllEvmNetworks())
  })

  describe("getEvmToken & findEvmToken", () => {
    it("returns USDC config by address", () => {
      const token = getEvmToken(11155111, USDC_SEPOLIA)
      expect(token.symbol).toBe("USDC")
      expect(token.expectedDecimals).toBe(6)
    })

    it("address is the unique identity — no semantic ID field", () => {
      const token = getEvmToken(11155111, USDC_SEPOLIA)
      expect(token).not.toHaveProperty("id")
    })

    it("checksum and lowercase lookup return the same token", () => {
      const byChecksum = getEvmToken(11155111, USDC_SEPOLIA)
      const byLowercase = getEvmToken(
        11155111,
        USDC_SEPOLIA.toLowerCase() as `0x${string}`,
      )
      expect(byChecksum.symbol).toBe(byLowercase.symbol)
      expect(byChecksum.address).toBe(byLowercase.address)
    })

    it("findEvmToken returns null for unknown token address", () => {
      expect(
        findEvmToken(11155111, "0x0000000000000000000000000000000000000000"),
      ).toBeNull()
    })

    it("getEvmToken throws for unknown token address", () => {
      expect(() =>
        getEvmToken(11155111, "0x0000000000000000000000000000000000000000"),
      ).toThrow()
    })

    it("findEvmToken returns null for invalid address format without throwing", () => {
      expect(findEvmToken(11155111, "0xinvalid")).toBeNull()
    })

    it("getEvmToken throws for invalid address format", () => {
      expect(() => getEvmToken(11155111, "0xinvalid")).toThrow()
    })
  })

  describe("getEvmTokensForChain", () => {
    it("returns only enabled tokens", () => {
      const tokens = getEvmTokensForChain(11155111)
      expect(tokens.length).toBeGreaterThan(0)
      tokens.forEach((t) => expect(t.enabled).toBe(true))
    })

    it("returns empty for unknown chain", () => {
      expect(getEvmTokensForChain(999999)).toEqual([])
    })
  })

  describe("explorer urls", () => {
    it("builds address + transaction urls", () => {
      expect(getAddressExplorerUrl(11155111, "0xabc")).toBe(
        "https://sepolia.etherscan.io/address/0xabc",
      )
      expect(getTransactionExplorerUrl(11155111, "0xdef")).toBe(
        "https://sepolia.etherscan.io/tx/0xdef",
      )
    })

    it("createExplorerConfig strips trailing slash", () => {
      const config = createExplorerConfig("Test", "https://example.com/")
      expect(config.url).toBe("https://example.com")
      expect(config.addressUrl("0x1")).toBe("https://example.com/address/0x1")
      expect(config.transactionUrl("0x2")).toBe("https://example.com/tx/0x2")
    })
  })
})
