"use client"

import { useEffect } from "react"
import type { Address } from "viem"
import { useQueryClient } from "@tanstack/react-query"
import { useWaitForTransactionReceipt } from "wagmi"

import { buildEvmWriteInvalidationFilters } from "../invalidation/evm-invalidation.adapter"
import { useEvmSelection } from "../../chain/selection/use-evm-selection"
import { type EvmTransactionHistoryItem } from "./evm-transaction-history"
import { updateEvmTransactionHistoryItem } from "./evm-transaction-history.storage"
/**
 * Reconciles pending transactions from localStorage after page reload or
 * chain/account switch. Invalidates relevant caches on receipt success so
 * balance/allowance reads stay fresh even when the write hook is no longer mounted.
 */
export function PendingReceiptReconciler(props: {
  chainId: number
  hash: `0x${string}`
  kind: EvmTransactionHistoryItem["kind"]
  tokenAddress?: Address
}) {
  const { chainId, hash, kind, tokenAddress } = props
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
        kind,
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
    kind,
    tokenAddress,
    account,
    queryClient,
  ])

  return null
}
