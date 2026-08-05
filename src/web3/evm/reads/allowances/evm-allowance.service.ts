import type { Address } from "viem"

import { isValidAddress } from "@/web3/evm/address"
import { standardErc20Abi } from "@/web3/evm/abi/erc20"
import {
  buildAllowanceContracts,
  mapAllowanceResults,
  normalizeAllowanceRequests,
  type EvmAllowanceRequest,
  type EvmAllowanceResult,
} from "@/web3/evm/reads/allowances/evm-allowance.adapter"
import { getEvmToken } from "@/web3/evm/chain/registry/evm-registry.adapter"
import { createEvmPublicClient } from "@/web3/evm/clients/create-evm-public-client"
import { createEvmWeb3Error } from "@/web3/evm/errors/evm-errors"

/**
 * Allowance service uses Viem directly — for scripts, server code and everything
 * place outside of React. In React use `useEvmAllowance` / `useEvmAllowances`.
 *
 * Pure logic (key, normalize, build, map) is located in `evm-allowance.adapter.ts` and
 * used in conjunction with hooks; This file only adds the I/O part.
 */
export async function getEvmAllowance(params: {
  chainId: number
  tokenAddress: Address
  ownerAddress: Address
  spenderAddress: Address
}): Promise<bigint> {
  const { chainId, tokenAddress, ownerAddress, spenderAddress } = params

  if (!isValidAddress(tokenAddress)) {
    throw createEvmWeb3Error(
      "INVALID_ADDRESS",
      `Invalid token address "${tokenAddress}".`,
    )
  }
  if (!isValidAddress(ownerAddress)) {
    throw createEvmWeb3Error(
      "INVALID_ADDRESS",
      `Invalid owner address "${ownerAddress}".`,
    )
  }
  if (!isValidAddress(spenderAddress)) {
    throw createEvmWeb3Error(
      "INVALID_ADDRESS",
      `Invalid spender address "${spenderAddress}".`,
    )
  }

  // Resolve token through registry — no arbitrary contracts
  const token = getEvmToken(chainId, tokenAddress)

  const client = createEvmPublicClient(chainId)
  return await client.readContract({
    address: token.address,
    abi: standardErc20Abi,
    functionName: "allowance",
    args: [ownerAddress, spenderAddress],
  })
}

export async function getEvmAllowances(params: {
  chainId: number
  requests: readonly EvmAllowanceRequest[]
}): Promise<readonly EvmAllowanceResult[]> {
  const { chainId } = params

  const requests = normalizeAllowanceRequests(chainId, params.requests)
  if (requests.length === 0) return []

  const client = createEvmPublicClient(chainId)
  const multicallResults = await client.multicall({
    allowFailure: true,
    contracts: buildAllowanceContracts({ requests }),
  })

  return mapAllowanceResults({
    chainId,
    requests,
    results: multicallResults,
  })
}
