import { web3Config } from "@/config/web3.config"
import { isValidAddress, toAddressKey } from "@/web3/evm/address"
import { createEvmWeb3Error } from "@/web3/evm/errors/evm-errors"
import {
  EVM_NETWORKS,
  EvmNetworkConfig,
  getAllEvmNetworks,
  getDefaultEvmNetwork,
  getEvmMainnets,
  getEvmNetworkByChainId,
  getEvmNetworkExplorer,
  getEvmNetworkNativeAsset,
  getEvmNetworkRpcUrl,
  getEvmTestnets,
  resolveEvmRpcUrl,
} from "@/web3/evm/chain/registry/evm-network.registry"
import type { AssetContractConfig } from "@/web3/evm/chain/registry/evm-registry.types"

export {
  getAllEvmNetworks,
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

export function findEvmNetworkByChainId(
  chainId: number,
): EvmNetworkConfig | null {
  return EVM_NETWORKS[chainId] ?? null
}

export function getDefaultEvmChainId(): number {
  return web3Config.defaultEvmChainId
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

const tokensByChainCache = new Map<number, readonly AssetContractConfig[]>()

export function getEvmTokensForChain(
  chainId: number,
): readonly AssetContractConfig[] {
  const cached = tokensByChainCache.get(chainId)
  if (cached) return cached

  const network = findEvmNetworkByChainId(chainId)
  if (!network) return Object.freeze([])

  const tokens = Object.freeze(
    Object.values(network.tokens).filter((token) => token.enabled),
  )
  tokensByChainCache.set(chainId, tokens)
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
  return Boolean(EVM_NETWORKS[chainId])
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
