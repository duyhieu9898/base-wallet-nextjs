"use client"

import { useWaitForTransactionReceipt } from "wagmi"

import { getEvmNetworkByChainId } from "@/web3/evm/chain/registry/evm-registry.adapter"

export function useEvmTransactionReceipt(input: {
  chainId?: number
  hash?: `0x${string}`
}) {
  const network = input.chainId
    ? getEvmNetworkByChainId(input.chainId)
    : undefined

  const query = useWaitForTransactionReceipt({
    hash: input.hash,
    chainId: network?.chain.id,
    query: { enabled: Boolean(input.hash) },
  })

  return {
    receipt: query.data ?? null,
    status: query.data?.status ?? null,
    isPending: query.isPending,
    isLoading: query.isLoading,
    isSuccess: query.isSuccess,
    isError: query.isError,
    error: query.error,
  }
}
