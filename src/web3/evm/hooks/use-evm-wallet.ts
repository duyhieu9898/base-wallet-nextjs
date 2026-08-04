"use client"

import { useConnect, useConnectors, useDisconnect, useSwitchChain } from "wagmi"

import type { EvmWalletConnection } from "@/web3/evm/types/evm-domain"
import { useEvmSelection } from "@/web3/evm/selection/use-evm-selection"

export function useEvmWallet() {
  const selection = useEvmSelection()
  const connectors = useConnectors()
  const connect = useConnect()
  const disconnect = useDisconnect()
  const switchChain = useSwitchChain()

  const wallet: EvmWalletConnection = {
    family: "evm",
    address: selection.account,
    connected:
      selection.status === "ready" || selection.status === "unsupported",
    connecting: connect.isPending || selection.status === "connecting",
  }

  return {
    wallet,
    selection,
    address: selection.account,
    chainId: selection.chainId,
    network: selection.network,
    connectors,
    connect: connect.mutate,
    connectError: connect.error,
    disconnect: disconnect.mutate,
    switchChain: switchChain.mutate,
    switchChainPending: switchChain.isPending,
  }
}
