"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { parseUnits, type Address, type Hash } from "viem"
import { useQueryClient } from "@tanstack/react-query"
import {
  useSimulateContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi"

import {
  type EvmWeb3Error,
  addEvmTransactionHistoryItem,
  assertEvmWriteReady,
  buildEvmWriteInvalidationFilters,
  createEvmWeb3Error,
  deriveEvmWriteStatus,
  findEvmToken,
  toEvmWeb3Error,
  toEvmWeb3ErrorOrNull,
  updateEvmTransactionHistoryItem,
  useEvmAllowance,
  useEvmSelection,
  useEvmWriteLifecycle,
} from "@nln/web3-evm"
import { findStakingDeployment } from "../contracts/staking-deployments"
import { recordStakingActivity } from "../history/staking-activity.storage"

/** The vault holds the chain's native asset and exactly one ERC-20. */
export type StakingAsset = "native" | "token"
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
  contractAddress: Address
  /**
   * Registry-canonical casing, not the raw registry field: Wagmi query keys are
   * compared as strings, so a lowercase address invalidates nothing silently.
   */
  tokenAddress?: Address
}>

export function isTokenStakeAllowanceSufficient(
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
    tokenAddress: activeDeployment?.tokenAddress,
    spenderAddress: activeDeployment?.contractAddress,
  })
  // Resolved once here so no view has to guess the vault's symbol or decimals.
  const stakingToken =
    chainId && activeDeployment
      ? (findEvmToken(chainId, activeDeployment.tokenAddress) ?? null)
      : null
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
  const queryClient = useQueryClient()
  const preparedTokenAddress = prepared?.tokenAddress
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

    try {
      updateEvmTransactionHistoryItem(hash, chainId ?? 0, {
        status: receipt.data.status === "success" ? "success" : "reverted",
      })
    } catch {
      // Isolated storage side effect
    }

    if (receipt.data.status !== "success") return

    // Staking moves the staked asset and, for the ERC-20, spends allowance. Refetching
    // the vault position alone leaves the wallet balance stale.
    if (chainId && account) {
      for (const filter of buildEvmWriteInvalidationFilters({
        kind: "contract-write",
        chainId,
        account,
        tokenAddress: preparedTokenAddress,
      })) {
        void queryClient.invalidateQueries(filter)
      }
    }

    onReceiptSuccessRef.current?.()
  }, [
    hash,
    lifecycle,
    receipt.data?.status,
    chainId,
    account,
    preparedTokenAddress,
    queryClient,
  ])

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
      input.asset === "token"
        ? findEvmToken(selection.chainId, contract.tokenAddress)
        : null
    if (input.asset === "token" && !token) {
      throw createEvmWeb3Error(
        "TOKEN_NOT_CONFIGURED",
        `Staking token ${contract.tokenAddress} is not configured on this network.`,
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
      input.asset === "token" &&
      input.operation === "stake" &&
      !isTokenStakeAllowanceSufficient(allowance.allowance, amount)
    ) {
      throw createEvmWeb3Error(
        "SIMULATION_FAILED",
        `Approve this ${token!.symbol} amount and wait for its successful receipt before staking.`,
      )
    }

    // `stakeUsdc`/`unstakeUsdc` are the deployed vault's function names, not a
    // frontend assumption: TestStakingVault exposes one hardcoded ERC-20 slot
    // (`usdc()`) and no generic `stakeToken(address, uint256)`. Supporting a
    // second token means deploying a different contract, not renaming this.
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
      contractAddress: contract.contractAddress,
      tokenAddress: token?.address,
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
    // Snapshot before the wallet opens: by the time a hash comes back the user
    // may have switched account or chain, and history must describe what was
    // actually signed (0012).
    const submitted =
      selection.status === "ready" && prepared
        ? {
            account: selection.account,
            chainId: selection.chainId,
            operation: prepared.operation,
            amount: prepared.formattedAmount,
            assetSymbol: prepared.assetSymbol,
            contractAddress: prepared.contractAddress,
            tokenAddress: prepared.tokenAddress,
          }
        : null
    try {
      const transactionHash = await mutateAsync({ ...simulation.data.request })
      // Two stores, two try/catch blocks (0012). The mechanical record describes
      // what the transaction did; the staking record describes why. Neither may
      // affect the transaction outcome, and the second must not be able to take
      // the first down with it — a mechanical record on its own still displays.
      try {
        if (submitted) {
          addEvmTransactionHistoryItem({
            hash: transactionHash,
            chainId: submitted.chainId,
            account: submitted.account,
            kind: "contract-write",
            submittedAt: Date.now(),
            updatedAt: Date.now(),
            status: "pending",
            assetSymbol: submitted.assetSymbol,
            amount: submitted.amount,
            contractAddress: submitted.contractAddress,
            tokenAddress: submitted.tokenAddress,
          })
        }
      } catch {
        // Isolated storage side effect
      }
      try {
        if (submitted) {
          recordStakingActivity({
            id: transactionHash,
            transactionHash,
            feature: "staking",
            action: submitted.operation,
            createdAt: Date.now(),
          })
        }
      } catch {
        // Isolated storage side effect
      }
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
    stakingToken,
    nativeSymbol: isReady
      ? selection.network.chain.nativeCurrency.symbol
      : null,
    tokenAllowance: allowance.allowance,
    isTokenAllowanceLoading: allowance.isPending || allowance.isFetching,
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
