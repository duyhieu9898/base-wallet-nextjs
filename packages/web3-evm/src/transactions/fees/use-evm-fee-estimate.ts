"use client"

import { encodeFunctionData, formatEther, type Hex } from "viem"
import { useEstimateGas, useEstimateFeesPerGas } from "wagmi"

import { toEvmWeb3ErrorOrNull } from "../../errors/evm-error.adapter"
import { createEvmWeb3Error, type EvmWeb3Error } from "../../errors/evm-errors"
import type { PreparedNativeTransfer } from "../native-transfer/prepare"
import type { PreparedTokenTransfer } from "../erc20-transfer/prepare"
import type { PreparedTokenApproval } from "../erc20-approval/prepare"
import { useEvmSelection } from "../../chain/selection/use-evm-selection"
import type { EvmFeeEstimate, EvmFeeEstimateStatus } from "./evm-fee-estimate"

export type EvmFeeEstimateTarget =
  | {
      kind: "native-transfer"
      prepared: PreparedNativeTransfer | null
    }
  | {
      kind: "token-transfer"
      prepared: PreparedTokenTransfer | null
    }
  | {
      kind: "token-approval"
      prepared: PreparedTokenApproval | null
    }

export function useEvmFeeEstimate(
  target: EvmFeeEstimateTarget | null,
): EvmFeeEstimate {
  const selection = useEvmSelection()

  const isReady = selection.status === "ready"
  const chainId = isReady ? selection.chainId : undefined
  const account = isReady ? selection.account : undefined
  const nativeSymbol = isReady
    ? selection.network.chain.nativeCurrency.symbol
    : null

  const isNative =
    target?.kind === "native-transfer" && target.prepared !== null
  const isContract =
    (target?.kind === "token-transfer" || target?.kind === "token-approval") &&
    target.prepared !== null

  let data: Hex | undefined
  let encodeError: EvmWeb3Error | null = null

  if (isContract && target.prepared && "abi" in target.prepared) {
    try {
      data = encodeFunctionData({
        abi: target.prepared.abi,
        functionName: target.prepared.functionName,
        args: target.prepared.args,
      })
    } catch (cause) {
      encodeError = createEvmWeb3Error(
        "SIMULATION_FAILED",
        "Failed to encode contract calldata.",
        cause,
      )
    }
  }

  const enabled = Boolean(
    isReady && account && chainId && target?.prepared && !encodeError,
  )

  const toAddress = target?.prepared
    ? "to" in target.prepared
      ? target.prepared.to
      : target.prepared.address
    : undefined

  const estimateGas = useEstimateGas({
    account,
    to: toAddress,
    value: isNative && target.prepared ? target.prepared.value : undefined,
    data,
    chainId,
    query: { enabled },
  })

  const estimateFees = useEstimateFeesPerGas({
    chainId,
    query: { enabled },
  })

  if (!enabled || !target?.prepared) {
    return {
      status: encodeError ? "error" : "idle",
      gasLimit: null,
      gasPrice: null,
      maxFeePerGas: null,
      estimatedFee: null,
      formattedFee: null,
      nativeSymbol: null,
      error: encodeError,
    }
  }

  const isLoading = estimateGas.isPending || estimateFees.isPending
  const gasError = toEvmWeb3ErrorOrNull(estimateGas.error, {
    phase: "simulation",
  })
  const feesError = toEvmWeb3ErrorOrNull(estimateFees.error, {
    phase: "receipt",
  })
  const error = encodeError ?? gasError ?? feesError

  const gasLimit = estimateGas.data ?? null
  const gasPrice = estimateFees.data?.gasPrice ?? null
  const maxFeePerGas = estimateFees.data?.maxFeePerGas ?? null

  const feePerGas = maxFeePerGas ?? gasPrice
  const estimatedFee =
    gasLimit !== null && feePerGas !== null && feePerGas !== undefined
      ? gasLimit * feePerGas
      : null

  const formattedFee = estimatedFee !== null ? formatEther(estimatedFee) : null

  let status: EvmFeeEstimateStatus = "idle"
  if (isLoading) {
    status = "estimating"
  } else if (error) {
    status = "error"
  } else if (estimatedFee !== null) {
    status = "success"
  } else if (gasLimit !== null) {
    // Gas limit ready but fee details still loading/missing
    status = "estimating"
  }

  return {
    status,
    gasLimit,
    gasPrice,
    maxFeePerGas,
    estimatedFee,
    formattedFee,
    nativeSymbol,
    error,
  }
}
