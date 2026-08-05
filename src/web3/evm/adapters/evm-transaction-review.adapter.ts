import { formatUnits, maxUint256 } from "viem"

import {
  getEvmNetworkByChainId,
  getEvmToken,
} from "@/web3/evm/chain/registry/evm-registry.adapter"
import type {
  PreparedNativeTransfer,
  PreparedTokenApproval,
  PreparedTokenTransfer,
} from "@/web3/evm/adapters/evm-transaction.adapter"
import { assertEvmWriteReady } from "@/web3/evm/chain/selection/assert-evm-write-ready"
import type { EvmSelection } from "@/web3/evm/chain/selection/evm-selection"
import type { EvmTransactionReview } from "@/web3/evm/types/evm-transaction-review"

export function buildNativeTransferReview(input: {
  selection: EvmSelection
  prepared: PreparedNativeTransfer
}): EvmTransactionReview {
  assertEvmWriteReady(input.selection)

  const network = getEvmNetworkByChainId(input.selection.chainId)
  const decimals = network.chain.nativeCurrency.decimals
  const amountStr = formatUnits(input.prepared.value, decimals)

  return {
    action: "native-transfer",
    chainId: input.selection.chainId,
    account: input.selection.account,
    recipient: input.prepared.to,
    amount: amountStr,
    rawAmount: input.prepared.value,
    assetSymbol: network.chain.nativeCurrency.symbol,
    networkName: network.chain.name,
    isMainnet: !network.chain.testnet,
  }
}

export function buildTokenTransferReview(input: {
  selection: EvmSelection
  prepared: PreparedTokenTransfer
}): EvmTransactionReview {
  assertEvmWriteReady(input.selection)

  const network = getEvmNetworkByChainId(input.selection.chainId)
  const token = getEvmToken(input.selection.chainId, input.prepared.address)
  const rawAmount = input.prepared.args[1]
  const amountStr = formatUnits(rawAmount, token.expectedDecimals)

  return {
    action: "token-transfer",
    chainId: input.selection.chainId,
    account: input.selection.account,
    tokenAddress: token.address,
    recipient: input.prepared.args[0],
    amount: amountStr,
    rawAmount,
    assetSymbol: token.symbol,
    networkName: network.chain.name,
    isMainnet: !network.chain.testnet,
  }
}

export function buildTokenApprovalReview(input: {
  selection: EvmSelection
  prepared: PreparedTokenApproval
}): EvmTransactionReview {
  assertEvmWriteReady(input.selection)

  const network = getEvmNetworkByChainId(input.selection.chainId)
  const token = getEvmToken(input.selection.chainId, input.prepared.address)
  const rawAmount = input.prepared.args[1]
  const amountStr =
    rawAmount === maxUint256
      ? "unlimited"
      : formatUnits(rawAmount, token.expectedDecimals)

  return {
    action: "token-approval",
    chainId: input.selection.chainId,
    account: input.selection.account,
    tokenAddress: token.address,
    spender: input.prepared.args[0],
    amount: amountStr,
    rawAmount,
    assetSymbol: token.symbol,
    networkName: network.chain.name,
    isMainnet: !network.chain.testnet,
    isUnlimitedApproval: rawAmount === maxUint256,
  }
}
