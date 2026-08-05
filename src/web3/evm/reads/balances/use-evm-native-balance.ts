"use client"

import { useBalance } from "wagmi"

import { normalizeNativeBalance } from "@/web3/evm/reads/balances/evm-balance.adapter"
import { useEvmSelection } from "@/web3/evm/chain/selection/use-evm-selection"

/**
 * Native balance of selected account (or a specified address).
 *
 * Only read onchain when selection is in `ready` state: `disconnected` state
 * intentionally keep the default chainId to render the catalog, not to issue RPC calls.
 */
export function useEvmNativeBalance(input?: { address?: `0x${string}` }) {
  const selection = useEvmSelection()

  const isReady = selection.status === "ready"
  const targetAddress =
    input?.address ?? (isReady ? selection.account : undefined)
  const chainId = isReady ? selection.chainId : undefined

  const query = useBalance({
    address: targetAddress,
    chainId,
    query: { enabled: isReady && Boolean(targetAddress && chainId) },
  })

  const balance =
    query.data && selection.network
      ? normalizeNativeBalance(query.data.value, selection.network)
      : null

  const isEnabled = isReady && Boolean(targetAddress && chainId)

  return {
    selection,
    balance,
    isPending: isEnabled && query.isPending,
    isFetching: isEnabled && query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
