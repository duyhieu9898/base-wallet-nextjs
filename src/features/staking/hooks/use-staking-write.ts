"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { parseUnits, type Hash } from "viem"
import {
  useSimulateContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi"

import {
  toEvmWeb3Error,
  toEvmWeb3ErrorOrNull,
} from "@/web3/evm/adapters/evm-error.adapter"
import { findEvmToken } from "@/web3/evm/adapters/evm-registry.adapter"
import { createEvmWeb3Error, type EvmWeb3Error } from "@/web3/evm/errors"
import { useEvmAllowance } from "@/web3/evm/hooks/use-evm-allowance"
import { useEvmWriteLifecycle } from "@/web3/evm/hooks/use-evm-write-lifecycle"
import { assertEvmWriteReady } from "@/web3/evm/selection/assert-evm-write-ready"
import { useEvmSelection } from "@/web3/evm/selection/use-evm-selection"
import { deriveEvmWriteStatus } from "@/web3/evm/types/evm-write-status"
import { findStakingDeployment } from "../contracts/staking-deployments"

export type StakingAsset = "native" | "usdc"
export type StakingOperation = "stake" | "unstake"

type PreparedStakingWrite = Readonly<{
  asset: StakingAsset
  operation: StakingOperation
  amount: bigint
  formattedAmount: string
  assetSymbol: string
  functionName: "stakeNative" | "unstakeNative" | "stakeUsdc" | "unstakeUsdc"
  args: readonly [] | readonly [bigint]
  value?: bigint
}>

export function isUsdcStakeAllowanceSufficient(
  allowance: bigint | null,
  requiredAmount: bigint,
): boolean {
  return allowance !== null && allowance >= requiredAmount
}

export function useStakingWrite(input?: { onReceiptSuccess?: () => void }) {
  const selection = useEvmSelection()
  const isReady = selection.status === "ready"
  const chainId = isReady ? selection.chainId : undefined
  const account = isReady ? selection.account : undefined
  const deployment = chainId ? findStakingDeployment(chainId) : null
  const activeDeployment = deployment?.status === "active" ? deployment : null
  const allowance = useEvmAllowance({
    tokenAddress: activeDeployment?.usdcAddress,
    spenderAddress: activeDeployment?.contractAddress,
  })
  const [prepared, setPrepared] = useState<PreparedStakingWrite | null>(null)
  const [hash, setHash] = useState<Hash | null>(null)
  const [submissionError, setSubmissionError] = useState<EvmWeb3Error | null>(
    null,
  )
  const currentKey = `${chainId}:${account}:${activeDeployment?.contractAddress}`

  const {
    writeContractAsync,
    mutateAsync: wagmiMutateAsync,
    isPending: isWriting,
    reset: resetWagmi,
  } = useWriteContract()
  const mutateAsync = writeContractAsync ?? wagmiMutateAsync
  const resetLocalState = useCallback(() => {
    setPrepared(null)
    setHash(null)
    setSubmissionError(null)
    resetWagmi()
  }, [resetWagmi])
  const lifecycle = useEvmWriteLifecycle({ currentKey, resetLocalState })

  const simulation = useSimulateContract({
    address: activeDeployment?.contractAddress,
    abi: activeDeployment?.abi,
    functionName: prepared?.functionName,
    args: prepared?.args,
    // Registry ABI is runtime JSON (generic `Abi`), so Wagmi cannot infer that
    // only stakeNative is payable even though the simulated calldata is valid.
    value: prepared?.value as never,
    chainId,
    account,
    query: {
      enabled: Boolean(isReady && account && activeDeployment && prepared),
    },
  })
  const receipt = useWaitForTransactionReceipt({
    hash: hash ?? undefined,
    chainId,
  })
  const onReceiptSuccessRef = useRef(input?.onReceiptSuccess)
  useEffect(() => {
    onReceiptSuccessRef.current = input?.onReceiptSuccess
  }, [input?.onReceiptSuccess])

  const receiptTerminal =
    receipt.data?.status === "success" || receipt.data?.status === "reverted"
  const receiptError = hash
    ? toEvmWeb3ErrorOrNull(receipt.error, { phase: "receipt" })
    : null
  const canAbandonTracking = hash !== null && receiptError !== null

  useEffect(() => {
    if (!hash || !receipt.data?.status || !lifecycle.markReceiptHandled(hash))
      return
    if (receipt.data.status === "success") onReceiptSuccessRef.current?.()
  }, [hash, lifecycle, receipt.data?.status])

  function prepare(input: {
    asset: StakingAsset
    operation: StakingOperation
    amount: string
  }) {
    assertEvmWriteReady(selection)
    lifecycle.assertNoActiveSubmission({
      hash,
      isReceiptTerminal: receiptTerminal,
      canAbandonTracking,
    })
    const contract = findStakingDeployment(selection.chainId)
    if (contract.status !== "active") {
      throw createEvmWeb3Error(
        "CONTRACT_NOT_DEPLOYED",
        `Staking vault is not deployed on chain ${selection.chainId}.`,
      )
    }

    const token =
      input.asset === "usdc"
        ? findEvmToken(selection.chainId, contract.usdcAddress)
        : null
    if (input.asset === "usdc" && !token) {
      throw createEvmWeb3Error(
        "TOKEN_NOT_CONFIGURED",
        "USDC is not configured on this network.",
      )
    }
    const decimals =
      input.asset === "native"
        ? selection.network.chain.nativeCurrency.decimals
        : token!.expectedDecimals
    let amount: bigint
    try {
      amount = parseUnits(input.amount, decimals)
    } catch (cause) {
      throw createEvmWeb3Error(
        "INVALID_AMOUNT",
        `Invalid amount "${input.amount}".`,
        cause,
      )
    }
    if (amount <= 0n)
      throw createEvmWeb3Error(
        "INVALID_AMOUNT",
        "Amount must be greater than 0.",
      )
    if (
      input.asset === "usdc" &&
      input.operation === "stake" &&
      !isUsdcStakeAllowanceSufficient(allowance.allowance, amount)
    ) {
      throw createEvmWeb3Error(
        "SIMULATION_FAILED",
        "Approve this USDC amount and wait for its successful receipt before staking.",
      )
    }

    const functionName =
      input.asset === "native"
        ? input.operation === "stake"
          ? "stakeNative"
          : "unstakeNative"
        : input.operation === "stake"
          ? "stakeUsdc"
          : "unstakeUsdc"
    const next: PreparedStakingWrite = {
      asset: input.asset,
      operation: input.operation,
      amount,
      formattedAmount: input.amount,
      assetSymbol:
        input.asset === "native"
          ? selection.network.chain.nativeCurrency.symbol
          : token!.symbol,
      functionName,
      args: functionName === "stakeNative" ? [] : [amount],
      value: functionName === "stakeNative" ? amount : undefined,
    }
    lifecycle.beginPreparation()
    setHash(null)
    setSubmissionError(null)
    resetWagmi()
    setPrepared(next)
    return next
  }

  async function confirm() {
    assertEvmWriteReady(selection)
    if (!simulation.data?.request)
      throw createEvmWeb3Error(
        "SIMULATION_FAILED",
        "Staking simulation is not ready yet.",
      )
    const operation = lifecycle.beginSubmission(hash)
    setSubmissionError(null)
    try {
      const transactionHash = await mutateAsync({ ...simulation.data.request })
      if (lifecycle.completeSubmission(operation, transactionHash))
        setHash(transactionHash)
      return transactionHash
    } catch (cause) {
      const mapped = toEvmWeb3Error(cause, { phase: "submission" })
      if (lifecycle.failSubmission(operation)) setSubmissionError(mapped)
      throw mapped
    }
  }

  const simulateError = toEvmWeb3ErrorOrNull(simulation.error, {
    phase: "simulation",
  })
  const revertedError =
    receipt.data?.status === "reverted"
      ? createEvmWeb3Error(
          "TRANSACTION_REVERTED",
          "Staking transaction reverted by contract.",
          receipt.data,
        )
      : null
  const error =
    submissionError ?? simulateError ?? revertedError ?? receiptError

  return {
    selection,
    deployment,
    usdcAllowance: allowance.allowance,
    isUsdcAllowanceLoading: allowance.isPending || allowance.isFetching,
    prepare,
    confirm,
    prepared,
    canConfirm: simulation.isSuccess,
    isSimulating: simulation.isPending,
    isWriting,
    hash,
    receiptStatus: receipt.data?.status ?? null,
    isReceiptLoading: receipt.isLoading,
    error,
    status: deriveEvmWriteStatus({
      hasPreparedRequest: prepared !== null,
      isSimulating: simulation.isPending,
      isReadyToSubmit: simulation.isSuccess,
      isWriting,
      hash,
      receiptStatus: receipt.data?.status ?? null,
      error,
    }),
    reset: () => {
      lifecycle.assertNoActiveSubmission({
        hash,
        isReceiptTerminal: receiptTerminal,
        canAbandonTracking,
      })
      lifecycle.clear()
    },
  }
}
