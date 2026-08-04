"use client"

import { useEffect } from "react"
import type { Address } from "viem"
import { useQueryClient } from "@tanstack/react-query"
import { useWaitForTransactionReceipt } from "wagmi"

import { buildEvmWriteInvalidationFilters } from "@/web3/evm/adapters/evm-invalidation.adapter"
import { useEvmSelection } from "@/web3/evm/selection/use-evm-selection"
import { updateEvmTransactionHistoryItem } from "@/web3/evm/storage/evm-transaction-history.storage"
import type { EvmTransactionHistoryItem } from "@/web3/evm/types/evm-transaction-history"

/**
 * Reconciles pending transactions from localStorage after page reload or
 * chain/account switch. Invalidates relevant caches on receipt success so
 * balance/allowance reads stay fresh even when the write hook is no longer mounted.
 */
export function PendingReceiptReconciler(props: {
  chainId: number
  hash: `0x${string}`
  action: EvmTransactionHistoryItem["action"]
  tokenAddress?: Address
}) {
  const { chainId, hash, action, tokenAddress } = props
  const queryClient = useQueryClient()
  const selection = useEvmSelection()
  const account = selection.status === "ready" ? selection.account : undefined
  const receipt = useWaitForTransactionReceipt({ hash, chainId })

  useEffect(() => {
    if (!receipt.data?.status) return

    try {
      updateEvmTransactionHistoryItem(hash, chainId, {
        status: receipt.data.status === "success" ? "success" : "reverted",
      })
    } catch {
      // Safe isolation
    }

    if (receipt.data.status === "success" && account) {
      for (const filter of buildEvmWriteInvalidationFilters({
        kind: action,
        chainId,
        account,
        tokenAddress,
      })) {
        void queryClient.invalidateQueries(filter)
      }
    }
  }, [
    receipt.data?.status,
    chainId,
    hash,
    action,
    tokenAddress,
    account,
    queryClient,
  ])

  return null
}
