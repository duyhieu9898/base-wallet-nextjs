import { useQuery } from "@tanstack/react-query"

import { useSolanaSelection } from "../../chain/selection/use-solana-selection"
import type { SolanaClusterKey } from "../../chain/registry/solana-registry.types"
import {
  fetchNativeBalance,
  fetchTokenBalances,
} from "./solana-balance.service"
import type { SolanaAssetBalance } from "./solana-balance.types"

/**
 * Query keys carry the cluster as well as the owner.
 *
 * The same account has different balances on devnet and mainnet, so a key that
 * omits the cluster serves one cluster's balance for the other after a switch.
 */
function nativeBalanceKey(cluster: SolanaClusterKey, owner: string) {
  return ["solana", "balance", "native", cluster, owner] as const
}

function tokenBalancesKey(cluster: SolanaClusterKey, owner: string) {
  return ["solana", "balance", "tokens", cluster, owner] as const
}

export function useSolanaNativeBalance(cluster?: SolanaClusterKey) {
  const selection = useSolanaSelection(cluster)
  const owner = selection.status === "ready" ? selection.account : null
  const clusterKey = selection.cluster.key

  return useQuery({
    queryKey: nativeBalanceKey(clusterKey, owner ?? ""),
    queryFn: () => fetchNativeBalance(clusterKey, owner as string),
    // Disabled rather than fetching with a placeholder owner: a read for an
    // empty address is a wasted RPC call that returns a misleading zero.
    enabled: owner !== null,
  })
}

export function useSolanaTokenBalances(cluster?: SolanaClusterKey) {
  const selection = useSolanaSelection(cluster)
  const owner = selection.status === "ready" ? selection.account : null
  const clusterKey = selection.cluster.key

  return useQuery<SolanaAssetBalance[]>({
    queryKey: tokenBalancesKey(clusterKey, owner ?? ""),
    queryFn: () => fetchTokenBalances(clusterKey, owner as string),
    enabled: owner !== null,
  })
}
