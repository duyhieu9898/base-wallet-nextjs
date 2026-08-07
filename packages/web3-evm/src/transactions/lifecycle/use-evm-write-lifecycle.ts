"use client"

import { useCallback, useEffect, useLayoutEffect, useRef } from "react"
import type { Hash } from "viem"

import { createEvmWeb3Error } from "../../errors/evm-errors"

type WriteOperation = {
  id: number
  key: string
}

export type UseEvmWriteLifecycleInput = {
  currentKey: string
  resetLocalState(): void
}

/**
 * Own the mechanical safety rules shared by EVM write hooks.
 *
 * Transaction-specific concerns—simulation, review, history shape and cache
 * invalidation—remain in each public hook.
 */
export function useEvmWriteLifecycle({
  currentKey,
  resetLocalState,
}: UseEvmWriteLifecycleInput) {
  const currentKeyRef = useRef(currentKey)
  const resetLocalStateRef = useRef(resetLocalState)
  const notifiedHashRef = useRef<Hash | null>(null)
  const submissionInFlightRef = useRef(false)
  const submittedHashRef = useRef<Hash | null>(null)
  const operationIdRef = useRef(0)

  useLayoutEffect(() => {
    currentKeyRef.current = currentKey
    resetLocalStateRef.current = resetLocalState
  }, [currentKey, resetLocalState])

  useEffect(() => {
    operationIdRef.current++
    notifiedHashRef.current = null
    submissionInFlightRef.current = false
    submittedHashRef.current = null
    resetLocalStateRef.current()
  }, [currentKey])

  const assertNoActiveSubmission = useCallback(
    ({
      hash,
      isReceiptTerminal,
      canAbandonTracking,
    }: {
      hash: Hash | null
      isReceiptTerminal: boolean
      canAbandonTracking: boolean
    }) => {
      const isAwaitingReceipt =
        (submittedHashRef.current !== null || hash !== null) &&
        !isReceiptTerminal &&
        !canAbandonTracking

      if (submissionInFlightRef.current || isAwaitingReceipt) {
        throw createEvmWeb3Error(
          "TRANSACTION_FAILED",
          "Cannot replace or reset an active transaction.",
        )
      }
    },
    [],
  )

  const beginPreparation = useCallback(() => {
    operationIdRef.current++
    notifiedHashRef.current = null
    submissionInFlightRef.current = false
    submittedHashRef.current = null
  }, [])

  const beginSubmission = useCallback(
    (hash: Hash | null): WriteOperation => {
      if (
        submissionInFlightRef.current ||
        submittedHashRef.current !== null ||
        hash !== null
      ) {
        throw createEvmWeb3Error(
          "TRANSACTION_FAILED",
          "Transaction has already been submitted.",
        )
      }

      submissionInFlightRef.current = true
      return { id: ++operationIdRef.current, key: currentKey }
    },
    [currentKey],
  )

  const isCurrentOperation = useCallback(
    (operation: WriteOperation) =>
      operationIdRef.current === operation.id &&
      currentKeyRef.current === operation.key,
    [],
  )

  const completeSubmission = useCallback(
    (operation: WriteOperation, hash: Hash): boolean => {
      if (!isCurrentOperation(operation)) return false

      submittedHashRef.current = hash
      submissionInFlightRef.current = false
      return true
    },
    [isCurrentOperation],
  )

  const failSubmission = useCallback(
    (operation: WriteOperation): boolean => {
      if (!isCurrentOperation(operation)) return false

      submissionInFlightRef.current = false
      submittedHashRef.current = null
      return true
    },
    [isCurrentOperation],
  )

  const markReceiptHandled = useCallback((hash: Hash): boolean => {
    if (notifiedHashRef.current === hash) return false

    notifiedHashRef.current = hash
    submissionInFlightRef.current = false
    return true
  }, [])

  const clear = useCallback(() => {
    operationIdRef.current++
    notifiedHashRef.current = null
    submissionInFlightRef.current = false
    submittedHashRef.current = null
    resetLocalStateRef.current()
  }, [])

  return {
    assertNoActiveSubmission,
    beginPreparation,
    beginSubmission,
    completeSubmission,
    failSubmission,
    markReceiptHandled,
    clear,
  }
}
