/**
 * Read selectors over the injected cluster registry.
 *
 * UI and features never read registry data directly — same rule as the EVM
 * runtime's decision 0001. Everything here is a pure function over the installed
 * config, so it is callable from hooks, services and node scripts alike.
 *
 * Two flavours on purpose, matching the EVM adapter: `find*` returns `undefined`
 * for a lookup that is allowed to miss, `get*` throws for a preflight where a
 * miss is a bug.
 */

import { createSolanaWeb3Error } from "../../errors/solana-errors"
import { getSolanaRuntimeConfig } from "./solana-runtime-config"
import type {
  SolanaClusterConfig,
  SolanaClusterKey,
  SplTokenConfig,
} from "./solana-registry.types"

export function getAllSolanaClusters(): readonly SolanaClusterConfig[] {
  return getSolanaRuntimeConfig().clusters
}

export function findSolanaCluster(
  key: SolanaClusterKey,
): SolanaClusterConfig | undefined {
  return getAllSolanaClusters().find((cluster) => cluster.key === key)
}

export function getSolanaCluster(key: SolanaClusterKey): SolanaClusterConfig {
  const cluster = findSolanaCluster(key)

  if (!cluster) {
    throw createSolanaWeb3Error(
      "CLUSTER_NOT_FOUND",
      `Solana cluster "${key}" is not in the registry.`,
    )
  }

  return cluster
}

export function getDefaultSolanaCluster(): SolanaClusterConfig {
  return getSolanaCluster(getSolanaRuntimeConfig().defaultCluster)
}

export function isSolanaClusterSupported(key: string): boolean {
  return getAllSolanaClusters().some((cluster) => cluster.key === key)
}

export function getSolanaRpcUrl(key: SolanaClusterKey): string {
  return getSolanaCluster(key).rpcUrl
}

/**
 * Enabled tokens only.
 *
 * A disabled token stays in the registry so its metadata survives for reading
 * history, but it must not appear in a balance list or a token picker.
 */
export function getSolanaTokensForCluster(
  key: SolanaClusterKey,
): readonly SplTokenConfig[] {
  return Object.values(getSolanaCluster(key).tokens).filter(
    (token) => token.enabled,
  )
}

export function findSolanaToken(
  key: SolanaClusterKey,
  mint: string,
): SplTokenConfig | undefined {
  return getSolanaCluster(key).tokens[mint]
}

export function getSolanaToken(
  key: SolanaClusterKey,
  mint: string,
): SplTokenConfig {
  const token = findSolanaToken(key, mint)

  if (!token) {
    throw createSolanaWeb3Error(
      "TOKEN_NOT_CONFIGURED",
      `Mint ${mint} is not configured on cluster "${key}".`,
    )
  }

  return token
}

export function findSolanaTokenBySymbol(
  key: SolanaClusterKey,
  symbol: string,
): SplTokenConfig | undefined {
  return getSolanaTokensForCluster(key).find((token) => token.symbol === symbol)
}

export type SolanaExplorerLinkType = "address" | "transaction"

export function getAddressExplorerUrl(
  key: SolanaClusterKey,
  address: string,
): string {
  return getSolanaCluster(key).explorer.addressUrl(address)
}

export function getTransactionExplorerUrl(
  key: SolanaClusterKey,
  signature: string,
): string {
  return getSolanaCluster(key).explorer.transactionUrl(signature)
}
