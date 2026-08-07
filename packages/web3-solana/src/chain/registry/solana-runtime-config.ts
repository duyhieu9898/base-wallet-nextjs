/**
 * Runtime configuration injected by the consumer.
 *
 * Mirrors the EVM runtime's split of responsibility, which is a foundation rule
 * rather than an EVM detail: the package owns the *schema* and its validation,
 * the application owns the *data*. No environment variable name, no RPC
 * endpoint and no production cluster is known inside this package.
 *
 * Failures are raised at construction, not at the first RPC call. A duplicate
 * cluster or a default that is not in the registry is a boot-time configuration
 * bug, and surfacing it later as a network error hides where it came from.
 */

import { isValidAddress } from "../../address/address.utils"
import { createSolanaWeb3Error } from "../../errors/solana-errors"
import type {
  SolanaClusterConfig,
  SolanaClusterKey,
} from "./solana-registry.types"

export type SolanaRuntimeConfig = Readonly<{
  clusters: readonly SolanaClusterConfig[]
  defaultCluster: SolanaClusterKey
}>

export function createSolanaRuntimeConfig(
  input: SolanaRuntimeConfig,
): SolanaRuntimeConfig {
  const { clusters, defaultCluster } = input

  if (clusters.length === 0) {
    throw createSolanaWeb3Error(
      "RUNTIME_NOT_CONFIGURED",
      "Solana runtime config must declare at least one cluster.",
    )
  }

  const seen = new Set<SolanaClusterKey>()

  for (const cluster of clusters) {
    if (seen.has(cluster.key)) {
      throw createSolanaWeb3Error(
        "CLUSTER_NOT_FOUND",
        `Duplicate Solana cluster "${cluster.key}".`,
      )
    }
    seen.add(cluster.key)

    if (cluster.rpcUrl === "") {
      throw createSolanaWeb3Error(
        "RUNTIME_NOT_CONFIGURED",
        `Cluster "${cluster.key}" has no rpcUrl. Solana has no built-in default transport, so an endpoint must be named.`,
      )
    }

    for (const [mint, token] of Object.entries(cluster.tokens)) {
      // A malformed mint is only detectable as "balance is always zero" once it
      // reaches a read, because the token account derived from it simply does
      // not exist. Reject it where the operator can still see the typo.
      if (!isValidAddress(mint)) {
        throw createSolanaWeb3Error(
          "INVALID_ADDRESS",
          `Token "${token.symbol}" on cluster "${cluster.key}" has an invalid mint address: ${mint}`,
        )
      }

      if (mint !== token.mint) {
        throw createSolanaWeb3Error(
          "TOKEN_METADATA_MISMATCH",
          `Token "${token.symbol}" on cluster "${cluster.key}" is keyed by ${mint} but declares mint ${token.mint}.`,
        )
      }

      if (!Number.isInteger(token.expectedDecimals)) {
        throw createSolanaWeb3Error(
          "TOKEN_METADATA_MISMATCH",
          `Token "${token.symbol}" on cluster "${cluster.key}" declares non-integer decimals.`,
        )
      }
    }
  }

  if (!seen.has(defaultCluster)) {
    throw createSolanaWeb3Error(
      "CLUSTER_NOT_FOUND",
      `Default Solana cluster "${defaultCluster}" is not present in the cluster registry.`,
    )
  }

  return Object.freeze({
    clusters: Object.freeze([...clusters]),
    defaultCluster,
  })
}

let installedConfig: SolanaRuntimeConfig | null = null

/**
 * Install the configuration the registry selectors read from.
 *
 * Module-scoped rather than React context, for the same reason as the EVM
 * runtime: selectors are plain functions called from hooks, services and node
 * scripts alike, and a context would not reach a smoke script.
 */
export function configureSolanaRuntime(
  config: SolanaRuntimeConfig,
): SolanaRuntimeConfig {
  installedConfig = config
  return config
}

export function getSolanaRuntimeConfig(): SolanaRuntimeConfig {
  if (!installedConfig) {
    throw createSolanaWeb3Error(
      "RUNTIME_NOT_CONFIGURED",
      "Solana runtime is not configured. Call configureSolanaRuntime(...) before reading the cluster registry.",
    )
  }

  return installedConfig
}

export function isSolanaRuntimeConfigured(): boolean {
  return installedConfig !== null
}

/** Test-only teardown so one test file cannot leak its config into the next. */
export function resetSolanaRuntime(): void {
  installedConfig = null
}
