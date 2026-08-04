import type { ChainFamily } from "@/web3/core/registry.types"

/**
 * Solana metadata-only catalog. DO NOT install SDK, DO NOT import into provider
 * tree. tree. Just save the structure so it's ready when the adapter is deployed.
 */

export const SOLANA_USDC_MINTS = {
  devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  mainnet: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
} as const

export const SOLANA_RPC_URLS = {
  devnet: "https://api.devnet.solana.com",
  mainnet: "https://api.mainnet-beta.solana.com",
} as const

export type SolanaCatalogEntry = {
  key: "solana-devnet" | "solana-mainnet"
  family: ChainFamily
  isTestnet: boolean
  rpcUrl: string
  explorerBaseUrl: string
  nativeAsset: {
    symbol: string
    name: string
    decimals: number
  }
  usdcMint: string
  faucet?: {
    label: string
    url: string
  }
  enabled: false
  runtimeImplemented: false
}

export const SOLANA_NETWORK_CATALOG: Record<
  "solana-devnet" | "solana-mainnet",
  SolanaCatalogEntry
> = {
  "solana-devnet": {
    key: "solana-devnet",
    family: "solana",
    isTestnet: true,
    rpcUrl: SOLANA_RPC_URLS.devnet,
    explorerBaseUrl: "https://explorer.solana.com",
    nativeAsset: { symbol: "SOL", name: "Solana", decimals: 9 },
    usdcMint: SOLANA_USDC_MINTS.devnet,
    faucet: { label: "Solana Faucet", url: "https://faucet.solana.com/" },
    enabled: false,
    runtimeImplemented: false,
  },

  "solana-mainnet": {
    key: "solana-mainnet",
    family: "solana",
    isTestnet: false,
    rpcUrl: SOLANA_RPC_URLS.mainnet,
    explorerBaseUrl: "https://explorer.solana.com",
    nativeAsset: { symbol: "SOL", name: "Solana", decimals: 9 },
    usdcMint: SOLANA_USDC_MINTS.mainnet,
    enabled: false,
    runtimeImplemented: false,
  },
}
