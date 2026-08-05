import { isAddress, type Address, type Chain } from "viem"
import { mainnet, sepolia } from "viem/chains"

import { web3Config } from "@/config/web3.config"
import type { ExplorerConfig, FaucetConfig } from "@/web3/core/registry.types"
import { createExplorerConfig } from "@/web3/core/registry.selectors"
import { toAddressKey } from "@/web3/core/address.utils"
import { createEvmWeb3Error } from "@/web3/evm/errors"
import type {
  AssetContractConfig,
  EvmNetworkConfig,
} from "./evm-registry.types"
import evmTokensJson from "./evm-tokens.json"

export type { AssetContractConfig, EvmNetworkConfig }

export type RawAssetContractConfig = {
  type: "erc20"
  symbol: string
  name: string
  expectedDecimals: number
  enabled: boolean
}

const rawEvmTokensMap = evmTokensJson as Record<string, unknown>

/**
 * Validate + normalize token map from JSON. Run at module import time
 * Wrong configuration causes the app to fail at boot time instead of when reading the contract.
 *
 * Exported to test directly with built-in input — this validation is not available
 * How to cover via static `evm-tokens.json`.
 */
export function hydrateTokens(
  rawTokens: unknown = {},
): Record<string, AssetContractConfig> {
  if (
    typeof rawTokens !== "object" ||
    rawTokens === null ||
    Array.isArray(rawTokens)
  ) {
    throw createEvmWeb3Error(
      "TOKEN_METADATA_MISMATCH",
      "Token registry for a network must be an object.",
    )
  }

  const hydrated: Record<string, AssetContractConfig> = {}
  for (const [addressKey, raw] of Object.entries(rawTokens)) {
    const address = addressKey as Address
    if (!isAddress(addressKey)) {
      throw createEvmWeb3Error(
        "INVALID_ADDRESS",
        `Invalid token address in config: "${addressKey}"`,
      )
    }

    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      throw createEvmWeb3Error(
        "TOKEN_METADATA_MISMATCH",
        `Token metadata for "${addressKey}" must be an object.`,
      )
    }

    const candidate = raw as Partial<RawAssetContractConfig>

    if (candidate.type !== "erc20") {
      throw createEvmWeb3Error(
        "TOKEN_METADATA_MISMATCH",
        `Invalid token type for "${addressKey}": expected "erc20", got "${String(candidate.type)}"`,
      )
    }

    if (
      typeof candidate.symbol !== "string" ||
      candidate.symbol.trim() === ""
    ) {
      throw createEvmWeb3Error(
        "TOKEN_METADATA_MISMATCH",
        `Invalid token symbol for "${addressKey}": symbol must be a non-empty string.`,
      )
    }

    if (typeof candidate.name !== "string" || candidate.name.trim() === "") {
      throw createEvmWeb3Error(
        "TOKEN_METADATA_MISMATCH",
        `Invalid token name for "${addressKey}": name must be a non-empty string.`,
      )
    }

    if (
      typeof candidate.expectedDecimals !== "number" ||
      !Number.isInteger(candidate.expectedDecimals) ||
      candidate.expectedDecimals < 0
    ) {
      throw createEvmWeb3Error(
        "TOKEN_METADATA_MISMATCH",
        `Invalid expectedDecimals for token "${addressKey}": ${candidate.expectedDecimals}`,
      )
    }

    if (typeof candidate.enabled !== "boolean") {
      throw createEvmWeb3Error(
        "TOKEN_METADATA_MISMATCH",
        `Invalid enabled flag for token "${addressKey}": enabled must be a boolean.`,
      )
    }

    const normalizedKey = toAddressKey(address)
    if (hydrated[normalizedKey]) {
      throw createEvmWeb3Error(
        "TOKEN_METADATA_MISMATCH",
        `Duplicate token address after normalization: "${addressKey}"`,
      )
    }

    hydrated[normalizedKey] = {
      type: candidate.type,
      symbol: candidate.symbol,
      name: candidate.name,
      address,
      expectedDecimals: candidate.expectedDecimals,
      enabled: candidate.enabled,
    }
  }
  return Object.freeze(hydrated)
}

export function resolveEvmRpcUrl(
  chain: Chain,
  rpcUrlOverride?: string,
): string {
  if (rpcUrlOverride) {
    return rpcUrlOverride
  }
  if (chain.id === sepolia.id && process.env.NEXT_PUBLIC_RPC_ETHEREUM_SEPOLIA) {
    return process.env.NEXT_PUBLIC_RPC_ETHEREUM_SEPOLIA
  }
  if (chain.id === mainnet.id && process.env.NEXT_PUBLIC_RPC_ETHEREUM_MAINNET) {
    return process.env.NEXT_PUBLIC_RPC_ETHEREUM_MAINNET
  }
  const defaultRpc = chain.rpcUrls.default.http[0]
  if (!defaultRpc) {
    throw createEvmWeb3Error(
      "NETWORK_NOT_FOUND",
      `No RPC configured for chainId ${chain.id}`,
    )
  }
  return defaultRpc
}

export function getEvmNetworkRpcUrl(network: EvmNetworkConfig): string {
  return resolveEvmRpcUrl(network.chain, network.rpcUrlOverride)
}

export function getEvmNetworkExplorer(
  network: EvmNetworkConfig,
): ExplorerConfig {
  return createExplorerConfig(
    network.chain.blockExplorers?.default.name ?? network.chain.name,
    network.chain.blockExplorers?.default.url ?? "",
  )
}

export function getEvmNetworkNativeAsset(network: EvmNetworkConfig) {
  return {
    type: "native" as const,
    name: network.chain.nativeCurrency.name,
    symbol: network.chain.nativeCurrency.symbol,
    decimals: network.chain.nativeCurrency.decimals,
  }
}

const CIRCLE_USDC_FAUCET: FaucetConfig = {
  label: "Circle USDC Faucet",
  url: "https://faucet.circle.com/",
  assetType: "token",
}

/**
 * Chain ID exists in only one place: `network.chain.id`. Map lookup
 * is derived from the list so there can be no difference between the key and the real chain.
 */
function toNetworkMap(
  networks: readonly EvmNetworkConfig[],
): Record<number, EvmNetworkConfig> {
  const map: Record<number, EvmNetworkConfig> = {}
  for (const network of networks) {
    if (map[network.chain.id]) {
      throw createEvmWeb3Error(
        "NETWORK_NOT_FOUND",
        `Duplicate EVM network for chainId ${network.chain.id}`,
      )
    }
    map[network.chain.id] = network
  }
  return Object.freeze(map)
}

const TESTNETS_ARRAY: readonly EvmNetworkConfig[] = Object.freeze([
  {
    key: "ethereum-sepolia",
    family: "evm" as const,
    chain: sepolia,
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
])

const MAINNETS_ARRAY: readonly EvmNetworkConfig[] = Object.freeze([
  {
    key: "ethereum-mainnet",
    family: "evm" as const,
    chain: mainnet,
    tokens: hydrateTokens(rawEvmTokensMap[mainnet.id]),
    faucets: Object.freeze([]),
  },
])

const ALL_NETWORKS_ARRAY: readonly EvmNetworkConfig[] = Object.freeze([
  ...TESTNETS_ARRAY,
  ...MAINNETS_ARRAY,
])

export const EVM_TESTNETS = toNetworkMap(TESTNETS_ARRAY)
export const EVM_MAINNETS = toNetworkMap(MAINNETS_ARRAY)
export const EVM_NETWORKS = toNetworkMap(ALL_NETWORKS_ARRAY)

export function getEvmTestnets(): readonly EvmNetworkConfig[] {
  return TESTNETS_ARRAY
}

export function getEvmMainnets(): readonly EvmNetworkConfig[] {
  return MAINNETS_ARRAY
}

export function getAllEvmNetworks(): readonly EvmNetworkConfig[] {
  return ALL_NETWORKS_ARRAY
}

export function getEvmNetworkByChainId(chainId: number): EvmNetworkConfig {
  const network = EVM_NETWORKS[chainId]
  if (!network) {
    throw createEvmWeb3Error(
      "NETWORK_NOT_FOUND",
      `EVM network not found for chainId ${chainId}`,
    )
  }
  return network
}

export function getDefaultEvmNetwork(): EvmNetworkConfig {
  const network = EVM_NETWORKS[web3Config.defaultEvmChainId]
  if (!network) {
    throw createEvmWeb3Error(
      "NETWORK_NOT_FOUND",
      `Default EVM chainId ${web3Config.defaultEvmChainId} is not supported in network registry.`,
    )
  }
  return network
}
