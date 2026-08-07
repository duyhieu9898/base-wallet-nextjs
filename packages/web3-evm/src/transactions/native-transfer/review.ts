import { formatUnits } from "viem"
import { getEvmNetworkByChainId } from "../../chain/registry/evm-registry.adapter"
import type { PreparedNativeTransfer } from "./prepare"
import { assertEvmWriteReady } from "../../chain/selection/assert-evm-write-ready"
import type { EvmSelection } from "../../chain/selection/evm-selection"
import type { EvmTransactionReview } from "../review/evm-transaction-review"

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
