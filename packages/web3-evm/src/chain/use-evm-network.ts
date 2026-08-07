"use client"

import { getDefaultEvmNetwork } from "./registry/evm-registry.adapter"
import { useEvmSelection } from "./selection/use-evm-selection"

export function useEvmNetwork() {
  const selection = useEvmSelection()

  return {
    networks: selection.networks,
    defaultNetwork: getDefaultEvmNetwork(),
    current: selection.network,
    currentChainId: selection.chainId,
    isCurrentActive: selection.status !== "unsupported",
    status: selection.status,
  }
}
