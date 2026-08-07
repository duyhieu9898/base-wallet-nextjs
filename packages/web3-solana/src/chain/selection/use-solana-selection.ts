import { useWallet } from "@solana/wallet-adapter-react"
import { useMemo } from "react"

import {
  getAllSolanaClusters,
  getDefaultSolanaCluster,
  getSolanaCluster,
} from "../registry/solana-registry.adapter"
import type { SolanaClusterKey } from "../registry/solana-registry.types"
import {
  resolveSolanaSelection,
  type SolanaSelection,
} from "./solana-selection"

/**
 * Account and cluster the current screen operates on.
 *
 * `cluster` is an argument rather than adapter state because the wallet does not
 * hold one — see the note in `solana-selection.ts`. Omit it to use the
 * registry's default.
 */
export function useSolanaSelection(
  cluster?: SolanaClusterKey,
): SolanaSelection {
  const { connected, connecting, publicKey } = useWallet()

  // `publicKey` is a PublicKey instance whose identity changes across renders
  // even when the account has not, so the base58 string is what the memo keys
  // on. Passing the instance would recompute on every render.
  const account = publicKey?.toBase58() ?? null

  return useMemo(
    () =>
      resolveSolanaSelection({
        connected,
        connecting,
        account,
        activeCluster: cluster
          ? getSolanaCluster(cluster)
          : getDefaultSolanaCluster(),
        availableClusters: getAllSolanaClusters(),
      }),
    [connected, connecting, account, cluster],
  )
}
