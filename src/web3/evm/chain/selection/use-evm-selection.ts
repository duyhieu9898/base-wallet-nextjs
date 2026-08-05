"use client"

import { useConnection } from "wagmi"

import {
  getAllEvmNetworks,
  getDefaultEvmNetwork,
} from "@/web3/evm/chain/registry/evm-registry.adapter"
import {
  type EvmSelection,
  resolveEvmSelection,
} from "@/web3/evm/chain/selection/evm-selection"

export function useEvmSelection(): EvmSelection {
  const connection = useConnection()
  const defaultNetwork = getDefaultEvmNetwork()
  const availableNetworks = getAllEvmNetworks()

  return resolveEvmSelection({
    connected: connection.isConnected,
    address: connection.address,
    chainId: connection.chainId,
    defaultNetwork,
    availableNetworks,
  })
}
