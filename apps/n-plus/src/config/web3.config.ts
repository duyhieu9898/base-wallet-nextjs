import { mainnet, sepolia } from "viem/chains"

import {
  createEvmRuntimeConfig,
  hydrateTokens,
  type EvmNetworkConfig,
  type EvmRuntimeConfig,
} from "@nln/web3-evm/config"

import evmTokensJson from "./evm-tokens.json"
import { readEnv } from "@/config/env"

/**
 * Application-owned Web3 configuration.
 *
 * The foundation package owns the registry *schema* and its validation; this
 * file owns the *data* — which networks this application supports, which tokens
 * live on them, which environment variables carry their RPC URLs, and which
 * chain is the default. A second application configures its own set here
 * without editing a line inside `@nln/web3-evm`.
 */

/**
 * Parse chain default ID from env.
 *
 * Absent → use fallback. Present but not a positive integer → throw:
 * misspelled env cannot silently run on a different chain than intended.
 * (A chain ID that is valid but absent from the registry is rejected separately
 * by `createEvmRuntimeConfig`.)
 */
export function resolveDefaultEvmChainId(
  raw: string | undefined,
  fallbackChainId: number = sepolia.id,
): number {
  if (raw === undefined || raw.trim() === "") {
    return fallbackChainId
  }

  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `VITE_DEFAULT_CHAIN_ID must be a positive integer chain ID, received "${raw}".`,
    )
  }

  return parsed
}

const rawEvmTokensMap = evmTokensJson as Record<string, unknown>

const CIRCLE_USDC_FAUCET = {
  label: "Circle USDC Faucet",
  url: "https://faucet.circle.com/",
  assetType: "token" as const,
}

/**
 * Reference network entries shipped with the base. An adopting application
 * reviews these and removes what it does not use (decision 0001).
 *
 * `rpcUrlOverride` is undefined when the variable is unset, which falls back to
 * the chain's public default RPC. Public defaults are a development
 * convenience, not a production provider strategy — replace before staging.
 */
export const evmNetworks: readonly EvmNetworkConfig[] = Object.freeze([
  {
    key: "ethereum-sepolia",
    family: "evm" as const,
    chain: sepolia,
    rpcUrlOverride: readEnv("VITE_RPC_ETHEREUM_SEPOLIA") || undefined,
    tokens: hydrateTokens(rawEvmTokensMap[sepolia.id]),
    faucets: Object.freeze([
      {
        label: "Chainlink Faucet",
        url: "https://faucets.chain.link/",
        assetType: "native" as const,
      },
      CIRCLE_USDC_FAUCET,
    ]),
  },
  {
    key: "ethereum-mainnet",
    family: "evm" as const,
    chain: mainnet,
    rpcUrlOverride: readEnv("VITE_RPC_ETHEREUM_MAINNET") || undefined,
    tokens: hydrateTokens(rawEvmTokensMap[mainnet.id]),
    faucets: Object.freeze([]),
  },
])

export const evmRuntimeConfig: EvmRuntimeConfig = createEvmRuntimeConfig({
  networks: evmNetworks,
  defaultChainId: resolveDefaultEvmChainId(readEnv("VITE_DEFAULT_CHAIN_ID")),
})

export const web3Config = {
  defaultEvmChainId: evmRuntimeConfig.defaultChainId,
}
