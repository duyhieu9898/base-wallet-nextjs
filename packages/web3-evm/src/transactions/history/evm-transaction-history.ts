import type { Address, Hash } from "viem"

/**
 * Mechanical transaction record — what the transaction did (decision 0012).
 *
 * The foundation records only what can be read back off the transaction itself.
 * Why the user did it — pool, tier, position, rank — belongs to the feature that
 * initiated it, in its own store, and is composed with this one at display time.
 *
 * The discriminator is `kind`, not `action`, to keep it visibly distinct from a
 * feature's business `action`. Membership, lending and staking all need their own
 * business vocabulary; a closed union in the foundation cannot hold three of them
 * without the foundation learning what a membership tier is.
 */

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
  kind: "native-transfer"
  assetSymbol: string
  amount: string
  recipient: Address
}

export type TokenTransferHistoryItem = BaseHistoryItem & {
  kind: "token-transfer"
  tokenAddress: Address
  assetSymbol: string
  amount: string
  recipient: Address
}

export type TokenApprovalHistoryItem = BaseHistoryItem & {
  kind: "token-approval"
  tokenAddress: Address
  assetSymbol: string
  amount: string
  spender: Address
}

/**
 * Any contract write that is not one of the three shapes above.
 *
 * This is where a feature write lands. It carries the contract that was called
 * and the value moved — both mechanical — and nothing about the business meaning
 * of the call. A `contract-write` with no matching feature activity is still a
 * complete, displayable record: that is required, because the feature store can
 * fail to write without the transaction being any less real.
 */
export type ContractWriteHistoryItem = BaseHistoryItem & {
  kind: "contract-write"
  contractAddress: Address
  assetSymbol: string
  amount: string
  tokenAddress?: Address
}

export type EvmTransactionHistoryItem =
  | NativeTransferHistoryItem
  | TokenTransferHistoryItem
  | TokenApprovalHistoryItem
  | ContractWriteHistoryItem

export type EvmTransactionHistoryKind = EvmTransactionHistoryItem["kind"]

/**
 * Feature activity record — why the user made the transaction.
 *
 * The foundation defines the *link* (a transaction hash and the owning feature)
 * and nothing else: `action` is a feature's own vocabulary, and each feature owns
 * whatever additional fields it stores alongside this. Without a fixed link shape,
 * membership and lending would each invent their own way to join business data to
 * a transaction, which is exactly what this split exists to prevent.
 */
export type FeatureActivityRecord = {
  /** Idempotency key. Use the hash, or a feature operation ID when one exists. */
  id: string
  transactionHash: Hash
  /** Owning feature, e.g. "staking" | "membership" | "lending". */
  feature: string
  /** Business action, defined by the feature. */
  action: string
  createdAt: number
}
