import { getSolanaTokensForCluster } from "../../chain/registry/solana-registry.adapter"
import type {
  SolanaClusterKey,
  SplTokenConfig,
} from "../../chain/registry/solana-registry.types"
import { useSolanaSelection } from "../../chain/selection/use-solana-selection"

/**
 * Token catalogue of the selected cluster, mirroring `useEvmTokenList`.
 *
 * Available in every selection state, including `disconnected`, so a signed-out
 * screen can render the catalogue with no balances. `SolanaSelection` always
 * carries a cluster — unlike the EVM equivalent, which returns an empty list
 * when the wallet's chain has not resolved — so there is no empty-list case
 * here.
 */
export function useSolanaTokenList(cluster?: SolanaClusterKey) {
  const selection = useSolanaSelection(cluster)
  const tokens: readonly SplTokenConfig[] = getSolanaTokensForCluster(
    selection.cluster.key,
  )

  return {
    selection,
    cluster: selection.cluster,
    tokens,
  }
}
