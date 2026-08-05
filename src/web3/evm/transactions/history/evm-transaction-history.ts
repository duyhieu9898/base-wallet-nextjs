import type { Address, Hash } from "viem"

export type EvmTransactionHistoryStatus =
  "pending" | "success" | "reverted" | "unknown"

export type BaseHistoryItem = {
  hash: Hash
  chainId: number
  account: Address
  submittedAt: number
  updatedAt: number
  status: EvmTransactionHistoryStatus
}

export type NativeTransferHistoryItem = BaseHistoryItem & {
  action: "native-transfer"
  assetSymbol: string
  amount: string
  recipient: Address
}

export type TokenTransferHistoryItem = BaseHistoryItem & {
  action: "token-transfer"
  tokenAddress: Address
  assetSymbol: string
  amount: string
  recipient: Address
}

export type TokenApprovalHistoryItem = BaseHistoryItem & {
  action: "token-approval"
  tokenAddress: Address
  assetSymbol: string
  amount: string
  spender: Address
}

export type EvmTransactionHistoryItem =
  | NativeTransferHistoryItem
  | TokenTransferHistoryItem
  | TokenApprovalHistoryItem
