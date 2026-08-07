/**
 * `Connection` factory over the injected cluster registry.
 *
 * Cached per cluster key rather than constructed per call. A `Connection` holds
 * a websocket endpoint for subscriptions, so building one per read would open a
 * socket per read.
 *
 * The cache is keyed by cluster **and** endpoint: a config swap in a test, or a
 * runtime that reinstalls a different RPC URL, must not keep handing back a
 * client pointed at the previous endpoint.
 */

import { Connection, type Commitment } from "@solana/web3.js"

import { createSolanaWeb3Error } from "../errors/solana-errors"
import { getSolanaCluster } from "../chain/registry/solana-registry.adapter"
import type { SolanaClusterKey } from "../chain/registry/solana-registry.types"

/**
 * Commitment for reads.
 *
 * `confirmed`, not `finalized`: a balance that lags 12-13 seconds behind the
 * chain reads as a bug to a user who just saw their transaction land.
 *
 * This is a **read** default and settles nothing about item 3 of
 * `docs/foundation/solana-runtime-requirement.md`, which asks what counts as
 * terminal evidence that a write succeeded. A stale balance corrects itself on
 * the next poll; a write wrongly concluded successful does not. Do not cite this
 * constant as precedent for the write decision.
 */
export const SOLANA_READ_COMMITMENT: Commitment = "confirmed"

const connections = new Map<string, { endpoint: string; client: Connection }>()

export function createSolanaConnection(key: SolanaClusterKey): Connection {
  const cluster = getSolanaCluster(key)
  const cached = connections.get(key)

  if (cached && cached.endpoint === cluster.rpcUrl) {
    return cached.client
  }

  const client = new Connection(cluster.rpcUrl, {
    commitment: SOLANA_READ_COMMITMENT,
  })

  connections.set(key, { endpoint: cluster.rpcUrl, client })

  return client
}

/**
 * Drop cached clients.
 *
 * Test-only, and paired with `resetSolanaRuntime`: a client cached under one
 * config would otherwise survive into the next test's registry.
 */
export function resetSolanaConnections(): void {
  connections.clear()
}

/**
 * Assert the endpoint is really serving the cluster the registry claims.
 *
 * Solana has no `chainId` a wallet can report, so "am I on devnet?" is not
 * answerable locally — it is an RPC call comparing genesis hashes. A mainnet URL
 * pasted into the devnet slot is otherwise invisible until a write moves real
 * funds.
 *
 * The caller supplies the expected hash because the package holds no production
 * constants; the application owns that data, like every other registry value.
 */
export async function assertSolanaClusterIdentity(
  key: SolanaClusterKey,
  expectedGenesisHash: string,
): Promise<void> {
  const actual = await createSolanaConnection(key).getGenesisHash()

  if (actual !== expectedGenesisHash) {
    throw createSolanaWeb3Error(
      "CLUSTER_MISMATCH",
      `Cluster "${key}" is configured with an endpoint whose genesis hash is ${actual}, expected ${expectedGenesisHash}.`,
    )
  }
}
