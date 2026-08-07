"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { Address, Hash } from "viem"

import { useEvmSelection } from "../../chain/selection/use-evm-selection"
import {
  addEvmTransactionHistoryItem,
  clearEvmTransactionHistory,
  EVM_TRANSACTION_HISTORY_CHANGE_EVENT,
  EVM_TRANSACTION_HISTORY_STORAGE_KEY,
  loadEvmTransactionHistory,
  updateEvmTransactionHistoryItem,
} from "./evm-transaction-history.storage"
import type { EvmTransactionHistoryItem } from "./evm-transaction-history"

export type UseEvmTransactionHistoryOptions = {
  filterCurrentAccount?: boolean
  filterCurrentChain?: boolean
}

export function useEvmTransactionHistory(
  options?: UseEvmTransactionHistoryOptions,
) {
  const selection = useEvmSelection()
  const filterCurrentAccount = options?.filterCurrentAccount ?? false
  const filterCurrentChain = options?.filterCurrentChain ?? false

  const isReady = selection.status === "ready"
  const currentAccount = isReady ? selection.account : null
  const currentChainId = isReady ? selection.chainId : null

  // Hydration safety: Start with empty list, load in useEffect
  const [rawTransactions, setRawTransactions] = useState<
    EvmTransactionHistoryItem[]
  >([])

  const refreshHistory = useCallback(() => {
    setRawTransactions(loadEvmTransactionHistory())
  }, [])

  useEffect(() => {
    // Initial client-side load deferred to avoid synchronous setState warning
    Promise.resolve().then(() => {
      refreshHistory()
    })

    function handleStorageChange(event: StorageEvent) {
      if (
        event.key === null ||
        event.key === EVM_TRANSACTION_HISTORY_STORAGE_KEY
      ) {
        refreshHistory()
      }
    }

    function handleCustomEvent() {
      refreshHistory()
    }

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange)
      window.addEventListener(
        EVM_TRANSACTION_HISTORY_CHANGE_EVENT,
        handleCustomEvent,
      )
      return () => {
        window.removeEventListener("storage", handleStorageChange)
        window.removeEventListener(
          EVM_TRANSACTION_HISTORY_CHANGE_EVENT,
          handleCustomEvent,
        )
      }
    }
  }, [refreshHistory])

  const transactions = useMemo(() => {
    return rawTransactions.filter((tx) => {
      if (
        filterCurrentAccount &&
        currentAccount &&
        tx.account.toLowerCase() !== currentAccount.toLowerCase()
      ) {
        return false
      }
      if (
        filterCurrentChain &&
        currentChainId &&
        tx.chainId !== currentChainId
      ) {
        return false
      }
      return true
    })
  }, [
    rawTransactions,
    filterCurrentAccount,
    currentAccount,
    filterCurrentChain,
    currentChainId,
  ])

  const pendingTransactions = useMemo(() => {
    return transactions.filter((tx) => tx.status === "pending")
  }, [transactions])

  const addTransaction = useCallback((item: EvmTransactionHistoryItem) => {
    const updated = addEvmTransactionHistoryItem(item)
    setRawTransactions(updated)
  }, [])

  const updateTransaction = useCallback(
    (
      hash: Hash,
      chainId: number,
      patch: Partial<EvmTransactionHistoryItem>,
    ) => {
      const updated = updateEvmTransactionHistoryItem(hash, chainId, patch)
      setRawTransactions(updated)
    },
    [],
  )

  const clearTransactions = useCallback(
    (filter?: { account?: Address; chainId?: number }) => {
      const updated = clearEvmTransactionHistory(filter)
      setRawTransactions(updated)
    },
    [],
  )

  return {
    transactions,
    pendingTransactions,
    addTransaction,
    updateTransaction,
    clearTransactions,
    refetch: refreshHistory,
  }
}
