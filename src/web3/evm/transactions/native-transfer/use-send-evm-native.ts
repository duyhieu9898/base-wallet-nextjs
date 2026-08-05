"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { Hash } from "viem"
import { useSendTransaction, useWaitForTransactionReceipt } from "wagmi"

import {
  toEvmWeb3ErrorOrNull,
  toEvmWeb3Error,
} from "@/web3/evm/errors/evm-error.adapter"
import { buildEvmWriteInvalidationFilters } from "@/web3/evm/transactions/invalidation/evm-invalidation.adapter"
import { type PreparedNativeTransfer, prepareSendEvmNative } from "./prepare"
import { buildNativeTransferReview } from "./review"
import {
  createEvmWeb3Error,
  type EvmWeb3Error,
} from "@/web3/evm/errors/evm-errors"
import { useEvmFeeEstimate } from "@/web3/evm/transactions/fees/use-evm-fee-estimate"
import { useEvmWriteLifecycle } from "@/web3/evm/transactions/lifecycle/use-evm-write-lifecycle"
import { assertEvmWriteReady } from "@/web3/evm/chain/selection/assert-evm-write-ready"
import { useEvmSelection } from "@/web3/evm/chain/selection/use-evm-selection"
import {
  addEvmTransactionHistoryItem,
  updateEvmTransactionHistoryItem,
} from "@/web3/evm/transactions/history/evm-transaction-history.storage"
import type { EvmTransactionReview } from "@/web3/evm/transactions/review/evm-transaction-review"
import { deriveEvmWriteStatus } from "@/web3/evm/transactions/lifecycle/evm-write-status"

export type UseSendEvmNativeInput = {
  onReceiptSuccess?: () => void
}

export function useSendEvmNative(input?: UseSendEvmNativeInput) {
  const selection = useEvmSelection()
  const queryClient = useQueryClient()

  const isReady = selection.status === "ready"
  const chainId = isReady ? selection.chainId : undefined
  const account = isReady ? selection.account : undefined

  const [request, setRequest] = useState<PreparedNativeTransfer | null>(null)
  const [review, setReview] = useState<EvmTransactionReview | null>(null)
  const [hash, setHash] = useState<Hash | null>(null)
  const [submissionError, setSubmissionError] = useState<EvmWeb3Error | null>(
    null,
  )

  const currentKey = `${chainId}:${account}`

  const feeEstimate = useEvmFeeEstimate({
    kind: "native-transfer",
    prepared: request,
  })

  const {
    sendTransactionAsync,
    mutateAsync: wagmiMutateAsync,
    isPending: isSending,
    reset: resetWagmi,
  } = useSendTransaction()
  const mutateAsync = sendTransactionAsync ?? wagmiMutateAsync
  const resetLocalState = useCallback(() => {
    setRequest(null)
    setReview(null)
    setHash(null)
    setSubmissionError(null)
    resetWagmi()
  }, [resetWagmi])
  const lifecycle = useEvmWriteLifecycle({ currentKey, resetLocalState })

  const receipt = useWaitForTransactionReceipt({
    hash: hash ?? undefined,
    chainId,
  })

  const onReceiptSuccessRef = useRef(input?.onReceiptSuccess)
  useEffect(() => {
    onReceiptSuccessRef.current = input?.onReceiptSuccess
  }, [input?.onReceiptSuccess])

  const isReceiptTerminal =
    receipt.data?.status === "success" || receipt.data?.status === "reverted"

  const receiptError =
    hash !== null
      ? toEvmWeb3ErrorOrNull(receipt.error, { phase: "receipt" })
      : null
  const canAbandonTracking = hash !== null && receiptError !== null

  useEffect(() => {
    if (!hash || !receipt.data?.status) return

    if (lifecycle.markReceiptHandled(hash)) {
      try {
        updateEvmTransactionHistoryItem(hash, chainId ?? 0, {
          status: receipt.data.status === "success" ? "success" : "reverted",
        })
      } catch {
        // Safe storage isolation
      }

      if (receipt.data.status === "success") {
        if (chainId && account) {
          for (const filter of buildEvmWriteInvalidationFilters({
            kind: "native-transfer",
            chainId,
            account,
          })) {
            void queryClient.invalidateQueries(filter)
          }
        }

        onReceiptSuccessRef.current?.()
      }
    }
  }, [receipt.data?.status, hash, chainId, account, queryClient, lifecycle])

  function stopTrackingReceipt() {
    if (hash === null || receiptError === null) return

    lifecycle.clear()
  }

  function prepare(prepareInput: { to: string; amount: string }) {
    assertEvmWriteReady(selection)
    lifecycle.assertNoActiveSubmission({
      hash,
      isReceiptTerminal,
      canAbandonTracking,
    })

    const prepared = prepareSendEvmNative({
      chainId: selection.chainId,
      to: prepareInput.to,
      amount: prepareInput.amount,
    })

    const txReview = buildNativeTransferReview({
      selection,
      prepared,
    })

    lifecycle.beginPreparation()
    setHash(null)
    setSubmissionError(null)
    resetWagmi()
    setRequest(prepared)
    setReview(txReview)

    return prepared
  }

  async function confirmSend() {
    assertEvmWriteReady(selection)

    if (!request) {
      throw createEvmWeb3Error(
        "SIMULATION_FAILED",
        "Cannot send: native transfer has not been prepared yet.",
      )
    }

    const operation = lifecycle.beginSubmission(hash)

    setSubmissionError(null)

    const submittedTransaction =
      selection.status === "ready" && review && request
        ? {
            account: selection.account,
            chainId: selection.chainId,
            symbol: selection.network.chain.nativeCurrency.symbol,
            amount: review.amount,
            to: request.to,
          }
        : null

    try {
      const txHash = await mutateAsync({
        to: request.to,
        value: request.value,
        chainId: selection.chainId,
      })

      try {
        if (submittedTransaction) {
          addEvmTransactionHistoryItem({
            hash: txHash,
            chainId: submittedTransaction.chainId,
            account: submittedTransaction.account,
            action: "native-transfer",
            submittedAt: Date.now(),
            updatedAt: Date.now(),
            status: "pending",
            assetSymbol: submittedTransaction.symbol,
            amount: submittedTransaction.amount,
            recipient: submittedTransaction.to,
          })
        }
      } catch {
        // Isolated storage side effect
      }

      // A stale operation must never touch the guards owned by a newer one.
      if (!lifecycle.completeSubmission(operation, txHash)) {
        return txHash
      }
      setHash(txHash)

      return txHash
    } catch (cause) {
      const mappedError = toEvmWeb3Error(cause, { phase: "submission" })

      if (lifecycle.failSubmission(operation)) {
        setSubmissionError(mappedError)
      }

      throw mappedError
    }
  }

  const revertedError =
    receipt.data?.status === "reverted"
      ? createEvmWeb3Error(
          "TRANSACTION_REVERTED",
          "Transaction reverted by contract.",
          receipt.data,
        )
      : null

  const error = submissionError ?? revertedError ?? receiptError

  const status = deriveEvmWriteStatus({
    hasPreparedRequest: request !== null,
    isReadyToSubmit: request !== null,
    isWriting: isSending,
    hash,
    receiptStatus: receipt.data?.status ?? null,
    error,
  })

  return {
    selection,
    prepare,
    confirmSend,
    review,
    feeEstimate,
    isSending,
    hash,
    receipt: receipt.data ?? null,
    receiptStatus: receipt.data?.status ?? null,
    isReceiptLoading: receipt.isLoading,
    receiptError,
    stopTrackingReceipt,
    status,
    error,
    reset: () => {
      lifecycle.assertNoActiveSubmission({
        hash,
        isReceiptTerminal,
        canAbandonTracking,
      })
      lifecycle.clear()
    },
  }
}
