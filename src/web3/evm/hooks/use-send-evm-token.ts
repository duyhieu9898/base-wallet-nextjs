"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { Address, Hash } from "viem"
import {
  useSimulateContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi"

import { standardErc20Abi } from "@/web3/evm/abi/erc20"
import {
  toEvmWeb3ErrorOrNull,
  toEvmWeb3Error,
} from "@/web3/evm/errors/evm-error.adapter"
import { buildEvmWriteInvalidationFilters } from "@/web3/evm/adapters/evm-invalidation.adapter"
import { findEvmToken } from "@/web3/evm/chain/registry/evm-registry.adapter"
import {
  type PreparedTokenTransfer,
  prepareSendEvmToken,
} from "@/web3/evm/adapters/evm-transaction.adapter"
import { buildTokenTransferReview } from "@/web3/evm/adapters/evm-transaction-review.adapter"
import {
  createEvmWeb3Error,
  type EvmWeb3Error,
} from "@/web3/evm/errors/evm-errors"
import { useEvmFeeEstimate } from "@/web3/evm/hooks/use-evm-fee-estimate"
import { useEvmWriteLifecycle } from "@/web3/evm/hooks/use-evm-write-lifecycle"
import { assertEvmWriteReady } from "@/web3/evm/chain/selection/assert-evm-write-ready"
import { useEvmSelection } from "@/web3/evm/chain/selection/use-evm-selection"
import {
  addEvmTransactionHistoryItem,
  updateEvmTransactionHistoryItem,
} from "@/web3/evm/storage/evm-transaction-history.storage"
import type { EvmTransactionReview } from "@/web3/evm/types/evm-transaction-review"
import { deriveEvmWriteStatus } from "@/web3/evm/types/evm-write-status"

export type UseSendEvmTokenInput = {
  tokenAddress?: Address
  onReceiptSuccess?: () => void
}

export function useSendEvmToken(input?: UseSendEvmTokenInput) {
  const selection = useEvmSelection()
  const queryClient = useQueryClient()

  const tokenAddress = input?.tokenAddress

  const isReady = selection.status === "ready"
  const chainId = isReady ? selection.chainId : undefined
  const account = isReady ? selection.account : undefined
  const token =
    isReady && tokenAddress
      ? findEvmToken(selection.chainId, tokenAddress)
      : null

  const [request, setRequest] = useState<PreparedTokenTransfer | null>(null)
  const [review, setReview] = useState<EvmTransactionReview | null>(null)
  const [hash, setHash] = useState<Hash | null>(null)
  const [submissionError, setSubmissionError] = useState<EvmWeb3Error | null>(
    null,
  )

  const currentKey = `${chainId}:${account}:${tokenAddress}`
  const feeEstimate = useEvmFeeEstimate({
    kind: "token-transfer",
    prepared: request,
  })

  const simulate = useSimulateContract({
    address: request?.address,
    abi: standardErc20Abi,
    functionName: "transfer",
    args: request?.args,
    chainId,
    account,
    query: {
      enabled: Boolean(isReady && request && account),
    },
  })

  const {
    writeContractAsync,
    mutateAsync: wagmiMutateAsync,
    isPending: isWriting,
    reset: resetWagmi,
  } = useWriteContract()
  const mutateAsync = writeContractAsync ?? wagmiMutateAsync
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

    if (!lifecycle.markReceiptHandled(hash)) return

    try {
      updateEvmTransactionHistoryItem(hash, chainId ?? 0, {
        status: receipt.data.status === "success" ? "success" : "reverted",
      })
    } catch {
      // Isolated storage side effect
    }

    if (receipt.data.status === "success" && chainId && account && token) {
      for (const filter of buildEvmWriteInvalidationFilters({
        kind: "token-transfer",
        chainId,
        account,
        tokenAddress: token.address,
      })) {
        void queryClient.invalidateQueries(filter)
      }
      onReceiptSuccessRef.current?.()
    }
  }, [
    hash,
    receipt.data?.status,
    chainId,
    account,
    token,
    queryClient,
    lifecycle,
  ])

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

    if (!tokenAddress || !findEvmToken(selection.chainId, tokenAddress)) {
      throw createEvmWeb3Error(
        "TOKEN_NOT_CONFIGURED",
        `Token address "${tokenAddress ?? ""}" is not configured on network ${selection.chainId}.`,
      )
    }

    const prepared = prepareSendEvmToken({
      chainId: selection.chainId,
      tokenAddress,
      to: prepareInput.to,
      amount: prepareInput.amount,
    })

    const txReview = buildTokenTransferReview({
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

    const simulated = simulate.data?.request
    if (!simulated) {
      throw createEvmWeb3Error(
        "SIMULATION_FAILED",
        "Cannot send: simulation result is not ready yet.",
      )
    }

    const operation = lifecycle.beginSubmission(hash)

    setSubmissionError(null)

    const submittedTransaction =
      selection.status === "ready" && token && review && request
        ? {
            account: selection.account,
            chainId: selection.chainId,
            symbol: token.symbol,
            tokenAddress: token.address,
            amount: review.amount,
            to: request.args[0],
          }
        : null

    try {
      const txHash = await mutateAsync({ ...simulated })

      try {
        if (submittedTransaction) {
          addEvmTransactionHistoryItem({
            hash: txHash,
            chainId: submittedTransaction.chainId,
            account: submittedTransaction.account,
            action: "token-transfer",
            submittedAt: Date.now(),
            updatedAt: Date.now(),
            status: "pending",
            assetSymbol: submittedTransaction.symbol,
            tokenAddress: submittedTransaction.tokenAddress,
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

  const simulateError = toEvmWeb3ErrorOrNull(simulate.error, {
    phase: "simulation",
  })
  const revertedError =
    receipt.data?.status === "reverted"
      ? createEvmWeb3Error(
          "TRANSACTION_REVERTED",
          "Transaction reverted by contract.",
          receipt.data,
        )
      : null

  const error =
    submissionError ?? revertedError ?? receiptError ?? simulateError

  const status = deriveEvmWriteStatus({
    hasPreparedRequest: request !== null,
    isSimulating: simulate.isPending,
    isReadyToSubmit: simulate.isSuccess,
    isWriting,
    hash,
    receiptStatus: receipt.data?.status ?? null,
    error,
  })

  return {
    selection,
    token,
    prepare,
    confirmSend,
    review,
    feeEstimate,
    isPreparing: simulate.isPending,
    simulateError,
    canSend: simulate.isSuccess,
    isWriting,
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
