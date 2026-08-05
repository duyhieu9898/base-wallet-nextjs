"use client"

import { useMemo } from "react"
import type { Address } from "viem"
import { useReadContracts } from "wagmi"

import { isValidAddress, toAddressKey } from "@/web3/evm/address"
import type { AssetContractConfig } from "@/web3/evm/chain/registry/evm-registry.types"
import {
  buildAllowanceContracts,
  mapAllowanceResults,
  type EvmAllowanceRequest,
  type EvmAllowanceResult,
} from "@/web3/evm/reads/allowances/evm-allowance.adapter"
import { findEvmToken } from "@/web3/evm/chain/registry/evm-registry.adapter"
import type { EvmErrorCode } from "@/web3/evm/errors/evm-errors"
import { useEvmSelection } from "@/web3/evm/chain/selection/use-evm-selection"
import { useEvmTokenList } from "@/web3/evm/reads/balances/use-evm-token-list"

/**
 * A token address was excluded from the query, with specific reasons:
 * - `INVALID_ADDRESS`: wrong hex format.
 * - `TOKEN_NOT_CONFIGURED`: correct format but not in the registry
 *   network is currently selected (or `enabled: false`).
 *
 * These two cases need different messages in the UI, so they are not combined.
 */
export type EvmRejectedToken = {
  address: string
  code: Extract<EvmErrorCode, "INVALID_ADDRESS" | "TOKEN_NOT_CONFIGURED">
}

/**
 * App-facing allowance list hook with sensible defaults.
 *
 * - `ownerAddress` defaults to the selected account.
 * - `tokenAddresses` defaults to all enabled tokens on the selected network.
 * - Network is derived from selected context.
 */
export function useEvmAllowances(input: {
  spenderAddress?: Address
  ownerAddress?: Address
  tokenAddresses?: readonly Address[]
  enabled?: boolean
}) {
  const selection = useEvmSelection()
  const { tokens: registryTokens } = useEvmTokenList()

  const isReady = selection.status === "ready"
  const chainId = isReady ? selection.chainId : undefined

  const ownerAddress =
    input.ownerAddress ?? (isReady ? selection.account : undefined)
  const spenderAddress = input.spenderAddress

  const validOwnerAddress =
    ownerAddress && isValidAddress(ownerAddress) ? ownerAddress : undefined
  const validSpenderAddress =
    spenderAddress && isValidAddress(spenderAddress)
      ? spenderAddress
      : undefined

  // Resolve token list, retaining specific reasons for each eliminated address
  const { resolvedTokens, rejectedTokens } = useMemo(() => {
    if (!chainId || !input.tokenAddresses) {
      return { resolvedTokens: registryTokens, rejectedTokens: [] }
    }

    const resolved: AssetContractConfig[] = []
    const rejected: EvmRejectedToken[] = []
    const seenKeys = new Set<string>()

    for (const addr of input.tokenAddresses) {
      if (!isValidAddress(addr)) {
        rejected.push({ address: addr, code: "INVALID_ADDRESS" })
        continue
      }
      const key = toAddressKey(addr)
      if (seenKeys.has(key)) {
        continue
      }
      seenKeys.add(key)

      const token = findEvmToken(chainId, addr)
      if (token) {
        resolved.push(token)
      } else {
        rejected.push({ address: addr, code: "TOKEN_NOT_CONFIGURED" })
      }
    }

    return { resolvedTokens: resolved, rejectedTokens: rejected }
  }, [chainId, input.tokenAddresses, registryTokens])

  const requests: EvmAllowanceRequest[] = useMemo(() => {
    if (!validOwnerAddress || !validSpenderAddress) return []
    return resolvedTokens.map((token) => ({
      tokenAddress: token.address,
      ownerAddress: validOwnerAddress,
      spenderAddress: validSpenderAddress,
    }))
  }, [resolvedTokens, validOwnerAddress, validSpenderAddress])

  const contracts = useMemo(
    () => buildAllowanceContracts({ requests, chainId }),
    [requests, chainId],
  )

  const isEnabled = Boolean(
    isReady &&
    chainId &&
    validOwnerAddress &&
    validSpenderAddress &&
    contracts.length > 0 &&
    (input.enabled ?? true),
  )

  const query = useReadContracts({
    contracts,
    query: { enabled: isEnabled },
  })

  const allowances: EvmAllowanceResult[] = useMemo(() => {
    if (!chainId || !query.data) return []
    // Query key has just changed (different token/spender/owner) but the old data has not been changed:
    // Consider that there is no data instead of mapping the index to another request.
    if (query.data.length !== requests.length) return []
    return mapAllowanceResults({
      chainId,
      requests,
      results: query.data,
    })
  }, [chainId, requests, query.data])

  const allowancesByKey = useMemo(() => {
    const map = new Map<string, EvmAllowanceResult>()
    for (const item of allowances) {
      map.set(item.key, item)
    }
    return map
  }, [allowances])

  const hasPartialFailures = allowances.some(
    (item) => item.status === "failure",
  )

  const hasConfigurationError = rejectedTokens.length > 0

  const allowanceErrors = allowances
    .filter(
      (item): item is Extract<EvmAllowanceResult, { status: "failure" }> =>
        item.status === "failure",
    )
    .map((item) => item.error)

  const errors = [...(query.error ? [query.error] : []), ...allowanceErrors]

  return {
    selection,
    allowances,
    allowancesByKey,
    rejectedTokens,
    hasConfigurationError,
    hasPartialFailures,
    isPending: isEnabled && query.isPending,
    isFetching: isEnabled && query.isFetching,
    isError: query.isError || hasConfigurationError,
    errors,
    refetch: query.refetch,
  }
}
