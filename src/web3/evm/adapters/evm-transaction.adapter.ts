import { type Address, isAddress, parseUnits } from "viem"

import { standardErc20Abi } from "@/web3/evm/abi/erc20"
import {
  getEvmNetworkByChainId,
  getEvmToken,
} from "@/web3/evm/adapters/evm-registry.adapter"
import { createEvmWeb3Error } from "@/web3/evm/errors"

export type PreparedNativeTransfer = {
  to: Address
  value: bigint
}

export type PreparedTokenTransfer = {
  address: Address
  abi: typeof standardErc20Abi
  functionName: "transfer"
  args: readonly [Address, bigint]
}

export type PreparedTokenApproval = {
  address: Address
  abi: typeof standardErc20Abi
  functionName: "approve"
  args: readonly [Address, bigint]
}

export function prepareSendEvmNative(input: {
  chainId: number
  to: string
  amount: string
}): PreparedNativeTransfer {
  const network = getEvmNetworkByChainId(input.chainId)

  if (!isAddress(input.to)) {
    throw createEvmWeb3Error(
      "INVALID_RECIPIENT",
      `Invalid recipient "${input.to}".`,
    )
  }

  let value: bigint
  try {
    value = parseUnits(input.amount, network.chain.nativeCurrency.decimals)
  } catch (cause) {
    throw createEvmWeb3Error(
      "INVALID_AMOUNT",
      `Invalid amount "${input.amount}".`,
      cause,
    )
  }

  if (value <= BigInt(0)) {
    throw createEvmWeb3Error("INVALID_AMOUNT", "Amount must be greater than 0.")
  }

  return { to: input.to as Address, value }
}

export function prepareSendEvmToken(input: {
  chainId: number
  tokenAddress: Address
  to: string
  amount: string
}): PreparedTokenTransfer {
  if (!isAddress(input.to)) {
    throw createEvmWeb3Error(
      "INVALID_RECIPIENT",
      `Invalid recipient "${input.to}".`,
    )
  }

  const token = getEvmToken(input.chainId, input.tokenAddress)

  let amount: bigint
  try {
    amount = parseUnits(input.amount, token.expectedDecimals)
  } catch (cause) {
    throw createEvmWeb3Error(
      "INVALID_AMOUNT",
      `Invalid amount "${input.amount}".`,
      cause,
    )
  }

  if (amount <= BigInt(0)) {
    throw createEvmWeb3Error("INVALID_AMOUNT", "Amount must be greater than 0.")
  }

  return {
    address: token.address,
    abi: standardErc20Abi,
    functionName: "transfer",
    args: [input.to as Address, amount],
  }
}

export function prepareApproveEvmToken(input: {
  chainId: number
  tokenAddress: Address
  spender: string
  amount: string
}): PreparedTokenApproval {
  if (!isAddress(input.spender)) {
    throw createEvmWeb3Error(
      "INVALID_ADDRESS",
      `Invalid spender address "${input.spender}".`,
    )
  }

  const token = getEvmToken(input.chainId, input.tokenAddress)

  let rawAmount: bigint
  try {
    rawAmount = parseUnits(input.amount, token.expectedDecimals)
  } catch (cause) {
    throw createEvmWeb3Error(
      "INVALID_AMOUNT",
      `Invalid amount "${input.amount}".`,
      cause,
    )
  }

  if (rawAmount < BigInt(0)) {
    throw createEvmWeb3Error("INVALID_AMOUNT", "Amount cannot be negative.")
  }

  return {
    address: token.address,
    abi: standardErc20Abi,
    functionName: "approve",
    args: [input.spender as Address, rawAmount],
  }
}
