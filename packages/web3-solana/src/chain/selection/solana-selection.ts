/**
 * Selection state: which account and which cluster reads and writes apply to.
 *
 * ## Why this has one state fewer than the EVM model
 *
 * `EvmSelection` carries an `unsupported` state, because an EVM wallet holds its
 * own `chainId` and can sit on a chain the application does not support — the
 * classic "please switch network" prompt.
 *
 * A Solana wallet reports no cluster at all. It signs whatever transaction it is
 * handed, against whichever RPC endpoint the *application* connected to. The
 * cluster is therefore always the application's choice and can never disagree
 * with the wallet, so `unsupported` would be a state that cannot occur.
 *
 * The risk does not disappear, it moves: nothing stops an endpoint labelled
 * `devnet` from actually serving mainnet. That is not detectable from selection
 * state — it needs `assertSolanaClusterIdentity`, which compares genesis hashes
 * over RPC.
 */

import type { SolanaClusterConfig } from "../registry/solana-registry.types"

export type SolanaSelectionStatus = "disconnected" | "connecting" | "ready"

export type SolanaSelection =
  | {
      status: "disconnected"
      account: null
      cluster: SolanaClusterConfig
      clusters: readonly SolanaClusterConfig[]
    }
  | {
      status: "connecting"
      account: null
      cluster: SolanaClusterConfig
      clusters: readonly SolanaClusterConfig[]
    }
  | {
      status: "ready"
      account: string
      cluster: SolanaClusterConfig
      clusters: readonly SolanaClusterConfig[]
    }

/**
 * `cluster` is non-null in every state, including `disconnected`.
 *
 * The application knows which cluster it is on before any wallet appears, so a
 * disconnected screen can still resolve explorer links and token metadata
 * without a null check at each call site.
 */
export function resolveSolanaSelection(input: {
  connected: boolean
  connecting: boolean
  account?: string | null
  activeCluster: SolanaClusterConfig
  availableClusters: readonly SolanaClusterConfig[]
}): SolanaSelection {
  const { connected, connecting, account, activeCluster, availableClusters } =
    input

  if (connected && account) {
    return {
      status: "ready",
      account,
      cluster: activeCluster,
      clusters: availableClusters,
    }
  }

  // `connecting` covers the wallet prompt being open, and also the window where
  // the adapter reports connected but has not yet exposed a public key.
  if (connecting || (connected && !account)) {
    return {
      status: "connecting",
      account: null,
      cluster: activeCluster,
      clusters: availableClusters,
    }
  }

  return {
    status: "disconnected",
    account: null,
    cluster: activeCluster,
    clusters: availableClusters,
  }
}
