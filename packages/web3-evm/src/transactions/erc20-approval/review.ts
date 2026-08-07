import { formatUnits, maxUint256 } from "viem"

import {
  getEvmNetworkByChainId,
  getEvmToken,
} from "../../chain/registry/evm-registry.adapter"
import type { PreparedTokenApproval } from "./prepare"
import { assertEvmWriteReady } from "../../chain/selection/assert-evm-write-ready"
import type { EvmSelection } from "../../chain/selection/evm-selection"
import type { EvmTransactionReview } from "../review/evm-transaction-review"

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
