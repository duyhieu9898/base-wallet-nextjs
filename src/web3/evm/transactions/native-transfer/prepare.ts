import { type Address, isAddress, parseUnits } from "viem"

import { getEvmNetworkByChainId } from "@/web3/evm/chain/registry/evm-registry.adapter"
import { createEvmWeb3Error } from "@/web3/evm/errors/evm-errors"

export type PreparedNativeTransfer = {
  to: Address
  value: bigint
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
