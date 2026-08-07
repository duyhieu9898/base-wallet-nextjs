import { formatUnits, type Address } from "viem"

import type { EvmAssetBalance } from "./evm-balance.types"
import { NATIVE_ASSET_ID } from "../../chain/registry/native-asset"
import { isValidAddress, toAddressKey } from "../../address"
import { standardErc20Abi } from "../../abi/erc20"
import { createEvmWeb3Error, type EvmWeb3Error } from "../../errors/evm-errors"
import { getEvmToken } from "../../chain/registry/evm-registry.adapter"
import type {
  AssetContractConfig,
  EvmNetworkConfig,
} from "../../chain/registry/evm-registry.types"

export type EvmTokenBalanceResult =
  | {
      status: "success"
      tokenAddress: Address
      balance: EvmAssetBalance
    }
  | {
      status: "failure"
      tokenAddress: Address
      /** Always typed error; The original RPC error is in `cause`. */
      error: EvmWeb3Error
    }

export type MulticallReadResult = {
  status: "success" | "failure"
  result?: unknown
  error?: unknown
}

export function normalizeNativeBalance(
  rawAmount: bigint,
  network: EvmNetworkConfig,
): EvmAssetBalance {
  const { decimals, symbol } = network.chain.nativeCurrency

  return {
    family: "evm",
    networkKey: network.chain.id,
    assetId: NATIVE_ASSET_ID,
    assetType: "native",
    rawAmount,
    formattedAmount: formatUnits(rawAmount, decimals),
    decimals,
    symbol,
  }
}

export function normalizeTokenBalance(
  rawAmount: bigint,
  network: EvmNetworkConfig,
  token: AssetContractConfig,
): EvmAssetBalance {
  return {
    family: "evm",
    networkKey: network.chain.id,
    assetId: toAddressKey(token.address),
    assetType: "erc20",
    address: toAddressKey(token.address),
    rawAmount,
    formattedAmount: formatUnits(rawAmount, token.expectedDecimals),
    decimals: token.expectedDecimals,
    symbol: token.symbol,
  }
}

/**
 * Validates, normalizes, and deduplicates a list of token addresses.
 * Each address is resolved through the registry. Keeps first occurrence order.
 */
export function normalizeTokenAddressList(
  chainId: number,
  addresses: readonly string[],
): AssetContractConfig[] {
  const seen = new Set<string>()
  const result: AssetContractConfig[] = []

  for (const addr of addresses) {
    if (!isValidAddress(addr)) {
      throw createEvmWeb3Error(
        "INVALID_ADDRESS",
        `Invalid token address "${addr}".`,
      )
    }
    const key = toAddressKey(addr as Address)
    if (seen.has(key)) continue
    seen.add(key)

    const token = getEvmToken(chainId, addr)
    result.push(token)
  }

  return result
}

export function buildTokenBalanceContracts(input: {
  tokens: readonly AssetContractConfig[]
  walletAddress: Address
  chainId?: number
}) {
  return input.tokens.map((token) => ({
    address: token.address,
    abi: standardErc20Abi,
    functionName: "balanceOf" as const,
    args: [input.walletAddress] as const,
    ...(input.chainId !== undefined ? { chainId: input.chainId } : {}),
  }))
}

/**
 * Map multicall results about tokens by index. Precondition: two arrays of the same length
 * — Length difference means request and result no longer match, not an error
 * read the contract, should fail early instead of assigning the wrong balance to another token.
 */
export function mapTokenBalanceResults(
  tokens: readonly AssetContractConfig[],
  network: EvmNetworkConfig,
  multicallResults: readonly MulticallReadResult[],
): EvmTokenBalanceResult[] {
  if (multicallResults.length !== tokens.length) {
    throw createEvmWeb3Error(
      "CONTRACT_READ_FAILED",
      `Multicall result length mismatch: expected ${tokens.length}, got ${multicallResults.length}`,
    )
  }

  return tokens.map((token, index) => {
    const res = multicallResults[index]
    const tokenAddressKey = toAddressKey(token.address)

    if (!res || res.status === "failure") {
      // Always wrap: Viem raw RPC error has multi-line message with payload,
      // Not suitable for posting directly to the UI. Keep it in `cause` for debugging.
      return {
        status: "failure",
        tokenAddress: tokenAddressKey,
        error: createEvmWeb3Error(
          "CONTRACT_READ_FAILED",
          `Unable to read balance of ${token.symbol} (${token.address}).`,
          res?.error,
        ),
      }
    }

    return {
      status: "success",
      tokenAddress: tokenAddressKey,
      balance: normalizeTokenBalance(res.result as bigint, network, token),
    }
  })
}
