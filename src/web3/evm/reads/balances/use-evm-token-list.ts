"use client"

import type { AssetContractConfig } from "@/web3/evm/chain/registry/evm-registry.types"
import { getEvmTokensForChain } from "@/web3/evm/chain/registry/evm-registry.adapter"
import { useEvmSelection } from "@/web3/evm/chain/selection/use-evm-selection"

/**
 * Token list of the currently selected network.
 *
 * `ready` → the wallet chain token is standing; `disconnected` → token of default
 * network to render the catalog. `connecting` and `unsupported` do not have a chainId so
 * return empty list.
 */
export function useEvmTokenList() {
  const selection = useEvmSelection()

  const tokens: readonly AssetContractConfig[] =
    selection.chainId !== null ? getEvmTokensForChain(selection.chainId) : []

  return {
    selection,
    chainId: selection.chainId,
    network: selection.network,
    tokens,
  }
}
