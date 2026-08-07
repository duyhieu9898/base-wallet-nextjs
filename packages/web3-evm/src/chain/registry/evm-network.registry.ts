import { isAddress, type Address, type Chain } from "viem"

import type { ExplorerConfig } from "./registry.types"
import { createExplorerConfig } from "./registry.selectors"
import { toAddressKey } from "../../address"
import { createEvmWeb3Error } from "../../errors/evm-errors"
import type {
  AssetContractConfig,
  EvmNetworkConfig,
} from "./evm-registry.types"
import {
  getEvmRuntimeConfig,
  type EvmRuntimeConfig,
} from "./evm-runtime-config"

export type { AssetContractConfig, EvmNetworkConfig }

export type RawAssetContractConfig = {
  type: "erc20"
  symbol: string
  name: string
  expectedDecimals: number
  enabled: boolean
}

/**
 * Validate + normalize a token map coming from consumer JSON.
 *
 * The foundation owns this validator; the application owns the JSON it is fed.
 * The application calls it while building its `EvmRuntimeConfig`, so invalid
 * configuration still fails at boot rather than as an RPC error later.
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

/**
 * RPC resolution order: consumer override, then the chain's own default.
 *
 * The environment variable names live in the application (they differ per app),
 * so the application reads them and passes the result as `rpcUrlOverride`.
 */
export function resolveEvmRpcUrl(
  chain: Chain,
  rpcUrlOverride?: string,
): string {
  if (rpcUrlOverride) {
    return rpcUrlOverride
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

/**
 * Per-config derived lookups.
 *
 * Keyed by the config object rather than by chainId: two different runtime
 * configs may both declare chain 11155111 with different tokens, and a
 * chainId-keyed cache would serve the first one to the second consumer.
 */
type DerivedRegistry = {
  byChainId: Record<number, EvmNetworkConfig>
  testnets: readonly EvmNetworkConfig[]
  mainnets: readonly EvmNetworkConfig[]
}

const derivedCache = new WeakMap<EvmRuntimeConfig, DerivedRegistry>()

/**
 * Chain ID exists in only one place: `network.chain.id`. Map lookup is derived
 * from the list so there can be no difference between the key and the real chain.
 */
function deriveRegistry(config: EvmRuntimeConfig): DerivedRegistry {
  const cached = derivedCache.get(config)
  if (cached) return cached

  const byChainId: Record<number, EvmNetworkConfig> = {}
  for (const network of config.networks) {
    byChainId[network.chain.id] = network
  }

  const derived: DerivedRegistry = {
    byChainId: Object.freeze(byChainId),
    testnets: Object.freeze(
      config.networks.filter((network) => network.chain.testnet === true),
    ),
    mainnets: Object.freeze(
      config.networks.filter((network) => network.chain.testnet !== true),
    ),
  }
  derivedCache.set(config, derived)
  return derived
}

export function getEvmTestnets(): readonly EvmNetworkConfig[] {
  return deriveRegistry(getEvmRuntimeConfig()).testnets
}

export function getEvmMainnets(): readonly EvmNetworkConfig[] {
  return deriveRegistry(getEvmRuntimeConfig()).mainnets
}

export function getAllEvmNetworks(): readonly EvmNetworkConfig[] {
  return getEvmRuntimeConfig().networks
}

export function findEvmNetworkByChainId(
  chainId: number,
): EvmNetworkConfig | null {
  return deriveRegistry(getEvmRuntimeConfig()).byChainId[chainId] ?? null
}

export function getEvmNetworkByChainId(chainId: number): EvmNetworkConfig {
  const network = findEvmNetworkByChainId(chainId)
  if (!network) {
    throw createEvmWeb3Error(
      "NETWORK_NOT_FOUND",
      `EVM network not found for chainId ${chainId}`,
    )
  }
  return network
}

export function getDefaultEvmChainId(): number {
  return getEvmRuntimeConfig().defaultChainId
}

/**
 * `createEvmRuntimeConfig` already rejects a default chain that is not in the
 * network list, so reaching the throw here means the config was constructed
 * without that validation.
 */
export function getDefaultEvmNetwork(): EvmNetworkConfig {
  const config = getEvmRuntimeConfig()
  const network = deriveRegistry(config).byChainId[config.defaultChainId]
  if (!network) {
    throw createEvmWeb3Error(
      "NETWORK_NOT_FOUND",
      `Default EVM chainId ${config.defaultChainId} is not supported in network registry.`,
    )
  }
  return network
}
