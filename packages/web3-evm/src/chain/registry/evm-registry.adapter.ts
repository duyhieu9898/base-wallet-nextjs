import { isValidAddress, toAddressKey } from "../../address"
import { createEvmWeb3Error } from "../../errors/evm-errors"
import {
  EvmNetworkConfig,
  findEvmNetworkByChainId,
  getAllEvmNetworks,
  getDefaultEvmChainId,
  getDefaultEvmNetwork,
  getEvmMainnets,
  getEvmNetworkByChainId,
  getEvmNetworkExplorer,
  getEvmNetworkNativeAsset,
  getEvmNetworkRpcUrl,
  getEvmTestnets,
  resolveEvmRpcUrl,
} from "./evm-network.registry"
import {
  getEvmRuntimeConfig,
  type EvmRuntimeConfig,
} from "./evm-runtime-config"
import type { AssetContractConfig } from "./evm-registry.types"

export {
  findEvmNetworkByChainId,
  getAllEvmNetworks,
  getDefaultEvmChainId,
  getDefaultEvmNetwork,
  getEvmMainnets,
  getEvmNetworkByChainId,
  getEvmNetworkExplorer,
  getEvmNetworkNativeAsset,
  getEvmNetworkRpcUrl,
  getEvmTestnets,
  resolveEvmRpcUrl,
}

export function findEvmNetworkByKey(key: string): EvmNetworkConfig | null {
  return getAllEvmNetworks().find((network) => network.key === key) ?? null
}

export function getEvmNetworkByKey(key: string): EvmNetworkConfig {
  const network = findEvmNetworkByKey(key)
  if (!network) {
    throw createEvmWeb3Error(
      "NETWORK_NOT_FOUND",
      `EVM network not found for key "${key}"`,
    )
  }
  return network
}

/**
 * Safe selector: returns matching enabled token or null.
 * Never throws on invalid tokenAddress or unknown chainId.
 */
export function findEvmToken(
  chainId: number,
  tokenAddress?: string,
): AssetContractConfig | null {
  if (!tokenAddress || !isValidAddress(tokenAddress)) return null
  const network = findEvmNetworkByChainId(chainId)
  if (!network) return null
  const key = toAddressKey(tokenAddress as `0x${string}`)
  const token = network.tokens[key]
  return token && token.enabled ? token : null
}

/**
 * Strict selector: resolves token or throws if invalid or not found.
 */
export function getEvmToken(
  chainId: number,
  tokenAddress: string,
): AssetContractConfig {
  const token = findEvmToken(chainId, tokenAddress)
  if (!token) {
    throw createEvmWeb3Error(
      "TOKEN_NOT_CONFIGURED",
      `Token "${tokenAddress}" not found or enabled on network with chainId ${chainId}`,
    )
  }
  return token
}

/**
 * Keyed by runtime config first: the same chainId can carry a different token
 * set under a different consumer config, and a chainId-only cache would hand
 * the first consumer's tokens to the second.
 */
const tokensByChainCache = new WeakMap<
  EvmRuntimeConfig,
  Map<number, readonly AssetContractConfig[]>
>()

export function getEvmTokensForChain(
  chainId: number,
): readonly AssetContractConfig[] {
  const config = getEvmRuntimeConfig()
  let perChain = tokensByChainCache.get(config)
  if (!perChain) {
    perChain = new Map()
    tokensByChainCache.set(config, perChain)
  }

  const cached = perChain.get(chainId)
  if (cached) return cached

  const network = findEvmNetworkByChainId(chainId)
  if (!network) return Object.freeze([])

  const tokens = Object.freeze(
    Object.values(network.tokens).filter((token) => token.enabled),
  )
  perChain.set(chainId, tokens)
  return tokens
}

/**
 * Safe selector: returns matching enabled token or null by symbol.
 * Case-insensitive match on token symbol.
 */
export function findEvmTokenBySymbol(
  chainId: number,
  symbol: string,
): AssetContractConfig | null {
  if (!symbol) return null
  const tokens = getEvmTokensForChain(chainId)
  const searchSymbol = symbol.trim().toLowerCase()
  return (
    tokens.find((token) => token.symbol.toLowerCase() === searchSymbol) ?? null
  )
}

export function isEvmNetworkSupported(chainId: number): boolean {
  return findEvmNetworkByChainId(chainId) !== null
}

export function getAddressExplorerUrl(
  chainId: number,
  address: string,
): string {
  const network = getEvmNetworkByChainId(chainId)
  return getEvmNetworkExplorer(network).addressUrl(address)
}

export function getTransactionExplorerUrl(
  chainId: number,
  hash: string,
): string {
  const network = getEvmNetworkByChainId(chainId)
  return getEvmNetworkExplorer(network).transactionUrl(hash)
}

export function getTokenExplorerUrl(
  chainId: number,
  tokenAddress: string,
): string {
  const network = getEvmNetworkByChainId(chainId)
  return getEvmNetworkExplorer(network).addressUrl(tokenAddress)
}

export function getBlockExplorerUrl(
  chainId: number,
  blockNumberOrHash: string | number,
): string {
  const network = getEvmNetworkByChainId(chainId)
  const explorer = getEvmNetworkExplorer(network)
  return `${explorer.url}/block/${blockNumberOrHash}`
}

export type EvmExplorerLinkType = "address" | "transaction" | "token" | "block"

/**
 * Unified explorer link generator aligned with Uniswap interface `getExplorerLink`.
 */
export function getEvmExplorerUrl(
  chainId: number,
  target: string | number,
  type: EvmExplorerLinkType,
): string {
  switch (type) {
    case "address":
      return getAddressExplorerUrl(chainId, String(target))
    case "transaction":
      return getTransactionExplorerUrl(chainId, String(target))
    case "token":
      return getTokenExplorerUrl(chainId, String(target))
    case "block":
      return getBlockExplorerUrl(chainId, target)
    default:
      return getAddressExplorerUrl(chainId, String(target))
  }
}
