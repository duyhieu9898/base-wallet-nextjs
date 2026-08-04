"use client"

import type { Address } from "viem"
import { useReadContract } from "wagmi"

import { isValidAddress } from "@/web3/core/address.utils"
import { standardErc20Abi } from "@/web3/evm/abi/erc20"
import { findEvmToken } from "@/web3/evm/adapters/evm-registry.adapter"
import { useEvmSelection } from "@/web3/evm/selection/use-evm-selection"

export function useEvmAllowance(input: {
  tokenAddress?: Address
  ownerAddress?: Address
  spenderAddress?: Address
  enabled?: boolean
}) {
  const selection = useEvmSelection()

  const isReady = selection.status === "ready"
  const chainId = isReady ? selection.chainId : undefined

  const ownerAddress =
    input.ownerAddress ?? (isReady ? selection.account : undefined)
  const spenderAddress = input.spenderAddress
  const tokenAddress = input.tokenAddress

  const validTokenAddress =
    tokenAddress && isValidAddress(tokenAddress) ? tokenAddress : undefined
  const validOwnerAddress =
    ownerAddress && isValidAddress(ownerAddress) ? ownerAddress : undefined
  const validSpenderAddress =
    spenderAddress && isValidAddress(spenderAddress)
      ? spenderAddress
      : undefined

  const token =
    chainId && validTokenAddress
      ? findEvmToken(chainId, validTokenAddress)
      : null

  const isEnabled = Boolean(
    isReady &&
    chainId &&
    token &&
    validOwnerAddress &&
    validSpenderAddress &&
    (input.enabled ?? true),
  )

  const query = useReadContract({
    address: token?.address,
    abi: standardErc20Abi,
    functionName: "allowance",
    args:
      validOwnerAddress && validSpenderAddress
        ? [validOwnerAddress, validSpenderAddress]
        : undefined,
    chainId,
    query: { enabled: isEnabled },
  })

  return {
    selection,
    token,
    allowance: query.data !== undefined ? query.data : null,
    isEnabled,
    isPending: isEnabled && query.isPending,
    isFetching: isEnabled && query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
