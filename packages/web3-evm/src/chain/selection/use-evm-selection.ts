"use client"

import { useConnection } from "wagmi"

import {
  getAllEvmNetworks,
  getDefaultEvmNetwork,
} from "../registry/evm-registry.adapter"
import { type EvmSelection, resolveEvmSelection } from "./evm-selection"

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
