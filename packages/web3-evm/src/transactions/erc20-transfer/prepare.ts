import { type Address, isAddress, parseUnits } from "viem"

import { standardErc20Abi } from "../../abi/erc20"
import { getEvmToken } from "../../chain/registry/evm-registry.adapter"
import { createEvmWeb3Error } from "../../errors/evm-errors"

export type PreparedTokenTransfer = {
  address: Address
  abi: typeof standardErc20Abi
  functionName: "transfer"
  args: readonly [Address, bigint]
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
