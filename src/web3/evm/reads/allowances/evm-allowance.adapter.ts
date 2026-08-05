import type { Address } from "viem"

import { isValidAddress, toAddressKey } from "@/web3/evm/address"
import { standardErc20Abi } from "@/web3/evm/abi/erc20"
import type { MulticallReadResult } from "@/web3/evm/reads/balances/evm-balance.adapter"
import {
  createEvmWeb3Error,
  type EvmWeb3Error,
} from "@/web3/evm/errors/evm-errors"
import { getEvmToken } from "@/web3/evm/chain/registry/evm-registry.adapter"

export type EvmAllowanceRequest = {
  tokenAddress: Address
  ownerAddress: Address
  spenderAddress: Address
}

export type EvmAllowanceResult =
  | {
      status: "success"
      key: string
      request: EvmAllowanceRequest
      allowance: bigint
    }
  | {
      status: "failure"
      key: string
      request: EvmAllowanceRequest
      /** Always typed error; The original RPC error is in `cause`. */
      error: EvmWeb3Error
    }

export function toAllowanceKey(
  chainId: number,
  ownerAddress: Address,
  tokenAddress: Address,
  spenderAddress: Address,
): string {
  return `${chainId}:${toAddressKey(ownerAddress)}:${toAddressKey(tokenAddress)}:${toAddressKey(spenderAddress)}`
}

/**
 * Validates, normalizes, and deduplicates allowance requests.
 * Each token is resolved through the registry. Keeps first occurrence order.
 * Identity is: token + owner + spender (all lowercased).
 */
export function normalizeAllowanceRequests(
  chainId: number,
  requests: readonly EvmAllowanceRequest[],
): EvmAllowanceRequest[] {
  const seen = new Set<string>()
  const result: EvmAllowanceRequest[] = []

  for (const req of requests) {
    if (!isValidAddress(req.ownerAddress)) {
      throw createEvmWeb3Error(
        "INVALID_ADDRESS",
        `Invalid owner address "${req.ownerAddress}".`,
      )
    }
    if (!isValidAddress(req.spenderAddress)) {
      throw createEvmWeb3Error(
        "INVALID_ADDRESS",
        `Invalid spender address "${req.spenderAddress}".`,
      )
    }
    if (!isValidAddress(req.tokenAddress)) {
      throw createEvmWeb3Error(
        "INVALID_ADDRESS",
        `Invalid token address "${req.tokenAddress}".`,
      )
    }

    // Resolve token through registry (throws if not found/enabled)
    const token = getEvmToken(chainId, req.tokenAddress)

    const identity = `${toAddressKey(token.address)}:${toAddressKey(req.ownerAddress)}:${toAddressKey(req.spenderAddress)}`
    if (seen.has(identity)) continue
    seen.add(identity)

    result.push({
      tokenAddress: token.address,
      ownerAddress: req.ownerAddress,
      spenderAddress: req.spenderAddress,
    })
  }

  return result
}

export function buildAllowanceContracts(input: {
  requests: readonly EvmAllowanceRequest[]
  chainId?: number
}) {
  return input.requests.map((req) => ({
    address: req.tokenAddress,
    abi: standardErc20Abi,
    functionName: "allowance" as const,
    args: [req.ownerAddress, req.spenderAddress] as const,
    ...(input.chainId !== undefined ? { chainId: input.chainId } : {}),
  }))
}

/**
 * Map multicall results about requests by index. Precondition: two arrays of the same degree
 * long — the difference in length means the request and result no longer match, so it fails
 * early instead of mistakenly assigning allowance to another token/spender pair.
 */
export function mapAllowanceResults(params: {
  chainId: number
  requests: readonly EvmAllowanceRequest[]
  results: readonly MulticallReadResult[]
}): EvmAllowanceResult[] {
  const { chainId, requests, results } = params

  if (results.length !== requests.length) {
    throw createEvmWeb3Error(
      "CONTRACT_READ_FAILED",
      `Multicall result length mismatch: expected ${requests.length}, got ${results.length}`,
    )
  }

  return requests.map((req, index) => {
    const key = toAllowanceKey(
      chainId,
      req.ownerAddress,
      req.tokenAddress,
      req.spenderAddress,
    )
    const res = results[index]

    if (!res || res.status === "failure") {
      return {
        status: "failure",
        key,
        request: {
          tokenAddress: toAddressKey(req.tokenAddress),
          ownerAddress: toAddressKey(req.ownerAddress),
          spenderAddress: toAddressKey(req.spenderAddress),
        },
        // Always wrap: Viem raw RPC error has multi-line message with payload,
        // Not suitable for posting directly to the UI. Keep it in `cause` for debugging.
        error: createEvmWeb3Error(
          "CONTRACT_READ_FAILED",
          `Unable to read allowance of token ${req.tokenAddress}.`,
          res?.error,
        ),
      }
    }

    return {
      status: "success",
      key,
      request: {
        tokenAddress: toAddressKey(req.tokenAddress),
        ownerAddress: toAddressKey(req.ownerAddress),
        spenderAddress: toAddressKey(req.spenderAddress),
      },
      allowance: res.result as bigint,
    }
  })
}
