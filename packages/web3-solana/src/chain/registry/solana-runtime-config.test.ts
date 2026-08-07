import { describe, expect, it } from "vitest"

import { SolanaWeb3Error } from "../../errors/solana-errors"
import type { SolanaClusterConfig } from "./solana-registry.types"
import { createSolanaRuntimeConfig } from "./solana-runtime-config"

const USDC_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"

function cluster(
  overrides: Partial<SolanaClusterConfig> = {},
): SolanaClusterConfig {
  return {
    key: "devnet",
    family: "solana",
    name: "Solana Devnet",
    rpcUrl: "https://api.devnet.solana.com",
    explorer: {
      name: "Solana Explorer",
      url: "https://explorer.solana.com",
      addressUrl: (address) =>
        `https://explorer.solana.com/address/${address}?cluster=devnet`,
      transactionUrl: (signature) =>
        `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    },
    tokens: {},
    faucets: [],
    ...overrides,
  }
}

describe("createSolanaRuntimeConfig", () => {
  it("freezes the accepted config", () => {
    const config = createSolanaRuntimeConfig({
      clusters: [cluster()],
      defaultCluster: "devnet",
    })

    expect(Object.isFrozen(config)).toBe(true)
    expect(Object.isFrozen(config.clusters)).toBe(true)
  })

  it("rejects an empty registry", () => {
    expect(() =>
      createSolanaRuntimeConfig({ clusters: [], defaultCluster: "devnet" }),
    ).toThrow(SolanaWeb3Error)
  })

  it("rejects a duplicate cluster", () => {
    expect(() =>
      createSolanaRuntimeConfig({
        clusters: [cluster(), cluster()],
        defaultCluster: "devnet",
      }),
    ).toThrow(/Duplicate Solana cluster/)
  })

  it("rejects a default that is not in the registry", () => {
    expect(() =>
      createSolanaRuntimeConfig({
        clusters: [cluster()],
        defaultCluster: "mainnet-beta",
      }),
    ).toThrow(/not present in the cluster registry/)
  })

  it("rejects a cluster with no rpcUrl", () => {
    // Solana ships no default transport, so an empty endpoint is not a
    // fallback — it is a boot-time bug that would surface as a network error.
    expect(() =>
      createSolanaRuntimeConfig({
        clusters: [cluster({ rpcUrl: "" })],
        defaultCluster: "devnet",
      }),
    ).toThrow(/no rpcUrl/)
  })

  it("rejects a token whose mint is not a valid address", () => {
    // Left unchecked this surfaces much later as a balance that is always zero,
    // because the token account derived from a bad mint simply does not exist.
    expect(() =>
      createSolanaRuntimeConfig({
        clusters: [
          cluster({
            tokens: {
              "not-a-mint": {
                mint: "not-a-mint",
                name: "Broken",
                symbol: "BRK",
                expectedDecimals: 6,
                enabled: true,
              },
            },
          }),
        ],
        defaultCluster: "devnet",
      }),
    ).toThrow(/invalid mint address/)
  })

  it("rejects a token keyed by an address other than its own mint", () => {
    expect(() =>
      createSolanaRuntimeConfig({
        clusters: [
          cluster({
            tokens: {
              [USDC_DEVNET]: {
                mint: "So11111111111111111111111111111111111111112",
                name: "USD Coin",
                symbol: "USDC",
                expectedDecimals: 6,
                enabled: true,
              },
            },
          }),
        ],
        defaultCluster: "devnet",
      }),
    ).toThrow(/is keyed by/)
  })

  it("accepts a well-formed token map", () => {
    const config = createSolanaRuntimeConfig({
      clusters: [
        cluster({
          tokens: {
            [USDC_DEVNET]: {
              mint: USDC_DEVNET,
              name: "USD Coin",
              symbol: "USDC",
              expectedDecimals: 6,
              enabled: true,
            },
          },
        }),
      ],
      defaultCluster: "devnet",
    })

    expect(config.clusters[0]?.tokens[USDC_DEVNET]?.symbol).toBe("USDC")
  })
})
