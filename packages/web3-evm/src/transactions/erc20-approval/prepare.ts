import { type Address, isAddress, parseUnits } from "viem"

import { standardErc20Abi } from "../../abi/erc20"
import { getEvmToken } from "../../chain/registry/evm-registry.adapter"
import { createEvmWeb3Error } from "../../errors/evm-errors"

export type PreparedTokenApproval = {
  address: Address
  abi: typeof standardErc20Abi
  functionName: "approve"
  args: readonly [Address, bigint]
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
