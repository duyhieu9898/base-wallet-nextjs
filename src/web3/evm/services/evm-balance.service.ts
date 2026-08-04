import type { Address } from "viem"

import { isValidAddress } from "@/web3/core/address.utils"
import type { EvmAssetBalance } from "@/web3/evm/types/evm-domain"
import { standardErc20Abi } from "@/web3/evm/abi/erc20"
import {
  buildTokenBalanceContracts,
  mapTokenBalanceResults,
  normalizeNativeBalance,
  normalizeTokenAddressList,
  normalizeTokenBalance,
  type EvmTokenBalanceResult,
} from "@/web3/evm/adapters/evm-balance.adapter"
import {
  getEvmNetworkByChainId,
  getEvmToken,
  getEvmTokensForChain,
} from "@/web3/evm/adapters/evm-registry.adapter"
import { createEvmPublicClient } from "@/web3/evm/clients/create-evm-public-client"
import { toAddressKey } from "@/web3/evm/evm-address"
import { createEvmWeb3Error } from "@/web3/evm/errors"

/**
 * Balance service uses Viem directly — for scripts, server code and everywhere else
 * besides React. In React use `useEvmBalances` to go through the Wagmi query cache.
 *
 * All pure logic (normalize / build / map) is located in `evm-balance.adapter.ts`
 * and is used in conjunction with hooks; This file only adds the I/O part.
 */
export type EvmBalances = {
  chainId: number
  walletAddress: Address
  native: EvmAssetBalance
  tokens: readonly EvmTokenBalanceResult[]
}

export async function getEvmNativeBalance(params: {
  chainId: number
  address: Address
}): Promise<EvmAssetBalance> {
  const network = getEvmNetworkByChainId(params.chainId)
  const client = createEvmPublicClient(params.chainId)
  const value = await client.getBalance({ address: params.address })
  return normalizeNativeBalance(value, network)
}

export async function getEvmTokenBalance(params: {
  chainId: number
  tokenAddress: Address
  walletAddress: Address
}): Promise<EvmAssetBalance> {
  const { chainId, tokenAddress, walletAddress } = params

  if (!isValidAddress(walletAddress)) {
    throw createEvmWeb3Error(
      "INVALID_ADDRESS",
      `Invalid wallet address "${walletAddress}".`,
    )
  }

  const network = getEvmNetworkByChainId(chainId)
  const token = getEvmToken(chainId, tokenAddress)
  const client = createEvmPublicClient(chainId)

  const rawAmount = await client.readContract({
    address: token.address,
    abi: standardErc20Abi,
    functionName: "balanceOf",
    args: [walletAddress],
  })

  return normalizeTokenBalance(rawAmount, network, token)
}

export async function getEvmBalances(params: {
  chainId: number
  walletAddress: Address
  tokenAddresses?: readonly Address[]
}): Promise<EvmBalances> {
  const { chainId, walletAddress, tokenAddresses } = params

  if (!isValidAddress(walletAddress)) {
    throw createEvmWeb3Error(
      "INVALID_ADDRESS",
      `Invalid wallet address "${walletAddress}".`,
    )
  }

  const network = getEvmNetworkByChainId(chainId)
  const client = createEvmPublicClient(chainId)

  const tokensToQuery = tokenAddresses
    ? normalizeTokenAddressList(chainId, tokenAddresses)
    : getEvmTokensForChain(chainId)

  const contracts = buildTokenBalanceContracts({
    tokens: tokensToQuery,
    walletAddress,
  })

  const [nativeResult, multicallResults] = await Promise.all([
    client.getBalance({ address: walletAddress }),
    contracts.length > 0
      ? client.multicall({ allowFailure: true, contracts })
      : Promise.resolve([]),
  ])

  return {
    chainId,
    walletAddress: toAddressKey(walletAddress),
    native: normalizeNativeBalance(nativeResult, network),
    tokens: mapTokenBalanceResults(tokensToQuery, network, multicallResults),
  }
}
