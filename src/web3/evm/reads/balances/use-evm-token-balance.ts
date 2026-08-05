"use client"

import type { Address } from "viem"
import { useReadContract } from "wagmi"

import { isValidAddress } from "@/web3/evm/address"
import { standardErc20Abi } from "@/web3/evm/abi/erc20"
import { normalizeTokenBalance } from "@/web3/evm/reads/balances/evm-balance.adapter"
import { findEvmToken } from "@/web3/evm/chain/registry/evm-registry.adapter"
import { useEvmSelection } from "@/web3/evm/chain/selection/use-evm-selection"

export function useEvmTokenBalance(input: {
  tokenAddress?: Address
  enabled?: boolean
}) {
  const selection = useEvmSelection()

  const isReady = selection.status === "ready"
  const chainId = isReady ? selection.chainId : undefined
  const validTokenAddress =
    input.tokenAddress && isValidAddress(input.tokenAddress)
      ? input.tokenAddress
      : undefined

  const token =
    chainId && validTokenAddress
      ? findEvmToken(chainId, validTokenAddress)
      : null

  const account = isReady ? selection.account : undefined

  const isEnabled = Boolean(
    isReady && chainId && token && account && (input.enabled ?? true),
  )

  const query = useReadContract({
    address: token?.address,
    abi: standardErc20Abi,
    functionName: "balanceOf",
    // Without an account, there are no args — avoid constructing a fake address (zero
    // address) is just to satisfy the type, because it will return balance 0 looking real if
    // The `enabled` condition was later relaxed.
    args: account ? [account] : undefined,
    chainId,
    query: { enabled: isEnabled },
  })

  const balance =
    query.data !== undefined && selection.network && token
      ? normalizeTokenBalance(query.data, selection.network, token)
      : null

  return {
    selection,
    token,
    balance,
    isPending: isEnabled && query.isPending,
    isFetching: isEnabled && query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
