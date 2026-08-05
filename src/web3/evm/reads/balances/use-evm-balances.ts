"use client"

import { useMemo } from "react"
import { useBalance, useReadContracts } from "wagmi"

import type { EvmAssetBalance } from "@/web3/evm/reads/balances/evm-balance.types"
import {
  buildTokenBalanceContracts,
  mapTokenBalanceResults,
  normalizeNativeBalance,
  type EvmTokenBalanceResult,
} from "@/web3/evm/reads/balances/evm-balance.adapter"
import { useEvmSelection } from "@/web3/evm/chain/selection/use-evm-selection"
import { useEvmTokenList } from "@/web3/evm/reads/balances/use-evm-token-list"

export function useEvmBalances() {
  const selection = useEvmSelection()
  const { tokens: tokenConfigs } = useEvmTokenList()

  const isReady = selection.status === "ready"
  const account = isReady ? selection.account : undefined
  const chainId =
    selection.status === "ready" || selection.status === "disconnected"
      ? selection.chainId
      : undefined

  const nativeQuery = useBalance({
    address: account,
    chainId,
    query: { enabled: isReady && Boolean(chainId) },
  })

  // If you don't have an account, don't make any contract calls — avoid using zero addresses
  // make fake values ​​just to satisfy the style.
  const tokenContracts = useMemo(
    () =>
      account
        ? buildTokenBalanceContracts({
            tokens: tokenConfigs,
            walletAddress: account,
            chainId,
          })
        : [],
    [tokenConfigs, account, chainId],
  )

  const hasTokens = tokenContracts.length > 0

  const tokensQuery = useReadContracts({
    contracts: tokenContracts,
    query: {
      enabled: isReady && Boolean(chainId) && hasTokens,
    },
  })

  const native: EvmAssetBalance | null = useMemo(() => {
    if (nativeQuery.data && selection.network) {
      return normalizeNativeBalance(nativeQuery.data.value, selection.network)
    }
    return null
  }, [nativeQuery.data, selection.network])

  const tokens: EvmTokenBalanceResult[] = useMemo(() => {
    if (!isReady || !selection.network || !tokensQuery.data) return []
    // Query key has just changed (different token list / chain) but the old data has not been changed:
    // Consider that there is no data instead of mapping the index to another token.
    if (tokensQuery.data.length !== tokenConfigs.length) return []
    return mapTokenBalanceResults(
      tokenConfigs,
      selection.network,
      tokensQuery.data,
    )
  }, [isReady, selection.network, tokenConfigs, tokensQuery.data])

  const byAddress = useMemo(() => {
    const map = new Map<string, EvmAssetBalance>()
    for (const item of tokens) {
      if (item.status === "success") {
        map.set(item.tokenAddress, item.balance)
      }
    }
    return map
  }, [tokens])

  const hasPartialFailures = tokens.some((item) => item.status === "failure")

  const tokenErrors = tokens
    .filter(
      (item): item is Extract<EvmTokenBalanceResult, { status: "failure" }> =>
        item.status === "failure",
    )
    .map((item) => item.error)

  const isEnabled = isReady && Boolean(chainId)
  const isPending =
    isEnabled && (nativeQuery.isPending || (hasTokens && tokensQuery.isPending))
  const isFetching =
    isEnabled &&
    (nativeQuery.isFetching || (hasTokens && tokensQuery.isFetching))
  const isError = nativeQuery.isError || tokensQuery.isError
  const errors = [nativeQuery.error, tokensQuery.error, ...tokenErrors].filter(
    Boolean,
  )

  return {
    selection,
    native,
    tokens,
    byAddress,
    hasPartialFailures,
    isPending,
    isFetching,
    isError,
    errors,
    refetch: async () => {
      const results = await Promise.all([
        nativeQuery.refetch(),
        hasTokens ? tokensQuery.refetch() : Promise.resolve(null),
      ])
      return results
    },
  }
}
