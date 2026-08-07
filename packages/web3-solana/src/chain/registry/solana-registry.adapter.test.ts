import { beforeEach, describe, expect, it } from "vitest"

import { SolanaWeb3Error } from "../../errors/solana-errors"
import {
  findSolanaToken,
  findSolanaTokenBySymbol,
  getAddressExplorerUrl,
  getAllSolanaClusters,
  getDefaultSolanaCluster,
  getSolanaCluster,
  getSolanaRpcUrl,
  getSolanaToken,
  getSolanaTokensForCluster,
  getTransactionExplorerUrl,
  isSolanaClusterSupported,
} from "./solana-registry.adapter"
import {
  configureSolanaRuntime,
  createSolanaRuntimeConfig,
} from "./solana-runtime-config"

const USDC = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
const RETIRED = "So11111111111111111111111111111111111111112"
const SOME_UNKNOWN_MINT = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"

beforeEach(() => {
  configureSolanaRuntime(
    createSolanaRuntimeConfig({
      defaultCluster: "devnet",
      clusters: [
        {
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
          tokens: {
            [USDC]: {
              mint: USDC,
              name: "USD Coin",
              symbol: "USDC",
              expectedDecimals: 6,
              enabled: true,
            },
            [RETIRED]: {
              mint: RETIRED,
              name: "Wrapped SOL",
              symbol: "wSOL",
              expectedDecimals: 9,
              enabled: false,
            },
          },
          faucets: [],
        },
      ],
    }),
  )
})

describe("cluster selectors", () => {
  it("reads the installed registry", () => {
    expect(getAllSolanaClusters()).toHaveLength(1)
    expect(getDefaultSolanaCluster().key).toBe("devnet")
    expect(getSolanaRpcUrl("devnet")).toBe("https://api.devnet.solana.com")
  })

  it("reports support without throwing", () => {
    expect(isSolanaClusterSupported("devnet")).toBe(true)
    expect(isSolanaClusterSupported("mainnet-beta")).toBe(false)
  })

  it("throws for a cluster that is not registered", () => {
    expect(() => getSolanaCluster("mainnet-beta")).toThrow(SolanaWeb3Error)
  })
})

describe("token selectors", () => {
  it("omits disabled tokens from the list", () => {
    // A disabled token keeps its metadata so history stays readable, but it must
    // not appear in a balance list or a picker.
    const symbols = getSolanaTokensForCluster("devnet").map(
      (token) => token.symbol,
    )

    expect(symbols).toEqual(["USDC"])
  })

  it("still resolves a disabled token by mint", () => {
    expect(findSolanaToken("devnet", RETIRED)?.symbol).toBe("wSOL")
  })

  it("returns undefined for an unknown mint", () => {
    expect(findSolanaToken("devnet", SOME_UNKNOWN_MINT)).toBeUndefined()
  })

  it("throws for an unknown mint in the strict lookup", () => {
    expect(() => getSolanaToken("devnet", SOME_UNKNOWN_MINT)).toThrow(
      /not configured on cluster/,
    )
  })

  it("finds an enabled token by symbol", () => {
    expect(findSolanaTokenBySymbol("devnet", "USDC")?.mint).toBe(USDC)
  })

  it("does not find a disabled token by symbol", () => {
    expect(findSolanaTokenBySymbol("devnet", "wSOL")).toBeUndefined()
  })
})

describe("explorer links", () => {
  it("builds an address URL for the cluster", () => {
    expect(getAddressExplorerUrl("devnet", USDC)).toBe(
      `https://explorer.solana.com/address/${USDC}?cluster=devnet`,
    )
  })

  it("builds a transaction URL from a signature", () => {
    expect(getTransactionExplorerUrl("devnet", "sig123")).toBe(
      "https://explorer.solana.com/tx/sig123?cluster=devnet",
    )
  })
})
