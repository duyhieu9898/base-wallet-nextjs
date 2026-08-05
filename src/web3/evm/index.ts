/**
 * EVM runtime — public boundary.
 *
 * Application và feature import runtime API từ `@/web3/evm`. Deep import vào
 * `@/web3/evm/**` là private internals và bị ESLint chặn.
 *
 * Ngoài barrel này chỉ có hai leaf path công khai, đều React-free và
 * wagmi-free, dành cho pure domain code không cần runtime:
 *
 * - `@/web3/evm/address`
 * - `@/web3/evm/errors`
 *
 * Provider composition nằm ở `@/web3/web3-providers`, không ở đây — xem ghi chú
 * tại mục Tier A bên dưới.
 *
 * Public surface chia hai tier có chủ đích:
 *
 * ## Tier A — Application API
 *
 * Hooks, types và helpers mà UI/application sử dụng trực tiếp. Chúng đã đóng
 * gói sẵn toàn bộ safety invariant của foundation.
 *
 * ## Tier B — Feature Extension API
 *
 * Primitive để một application feature tự triển khai contract-specific write
 * flow theo `docs/foundation/decisions/0015-feature-write-flows-and-approval-orchestration.md`.
 *
 * Tier B là public **có kiểm soát**, không phải accidental export. Consumer của
 * Tier B bắt buộc:
 *
 * - thực hiện `Prepare → Review → Confirm`, không submit thẳng từ UI;
 * - simulation với connected account trước khi mở wallet request;
 * - dùng `useEvmWriteLifecycle` làm guard cho mọi submission;
 * - không kết luận success chỉ từ transaction hash;
 * - giữ stale-operation protection khi account/chain/token/spender đổi;
 * - coi receipt là terminal evidence duy nhất cho success/revert;
 * - giữ side effects (callback, invalidation, history) once-per-hash.
 *
 * Feature bỏ qua các ràng buộc trên là làm yếu foundation safety invariant, điều
 * mà `EXTENSION_CONTRACT.md` cấm.
 *
 * Không export ở đây: internal operation refs, low-level query keys,
 * invalidation implementation, storage internals, test helpers, và bất kỳ
 * wrapper nào cho phép submit bỏ qua review.
 */

// ---------------------------------------------------------------------------
// Tier A — Application API
// ---------------------------------------------------------------------------

// Provider composition KHÔNG đi qua barrel này.
//
// `EvmProvider` được compose tại `@/web3/web3-providers` — điểm application
// chọn family runtime nào được mount. Export nó ở đây sẽ buộc mọi consumer của
// bất kỳ hook nào cũng phải instantiate `wagmi.createConfig` tại import time,
// kéo toàn bộ runtime vào những module graph chỉ cần một pure helper.

// Selection / readiness.
export { useEvmSelection } from "./chain/selection/use-evm-selection"
export type {
  EvmSelection,
  EvmSelectionStatus,
} from "./chain/selection/evm-selection"

// Wallet và network.
export { useEvmWallet } from "./chain/selection/use-evm-wallet"
export { useEvmNetwork } from "./chain/use-evm-network"

// Reads — balances.
export { useEvmNativeBalance } from "./reads/balances/use-evm-native-balance"
export { useEvmTokenBalance } from "./reads/balances/use-evm-token-balance"
export { useEvmBalances } from "./reads/balances/use-evm-balances"
export { useEvmTokenList } from "./reads/balances/use-evm-token-list"

// Reads — allowances.
export { useEvmAllowance } from "./reads/allowances/use-evm-allowance"
export {
  useEvmAllowances,
  type EvmRejectedToken,
} from "./reads/allowances/use-evm-allowances"

// Writes — public transaction hooks (prepare/review/confirm đã đóng gói).
export {
  useSendEvmNative,
  type UseSendEvmNativeInput,
} from "./transactions/native-transfer/use-send-evm-native"
export {
  useSendEvmToken,
  type UseSendEvmTokenInput,
} from "./transactions/erc20-transfer/use-send-evm-token"
export {
  useApproveEvmToken,
  type UseApproveEvmTokenInput,
} from "./transactions/erc20-approval/use-approve-evm-token"

// Fees, receipt tracking và history.
export {
  useEvmFeeEstimate,
  type EvmFeeEstimateTarget,
} from "./transactions/fees/use-evm-fee-estimate"
export { useEvmTransactionReceipt } from "./transactions/receipt/use-evm-transaction-receipt"
export {
  useEvmTransactionHistory,
  type UseEvmTransactionHistoryOptions,
} from "./transactions/history/use-evm-transaction-history"

// Public domain types.
export type { EvmAssetBalance } from "./reads/balances/evm-balance.types"
export type { EvmWalletConnection } from "./chain/selection/evm-wallet.types"
export type {
  EvmFeeEstimate,
  EvmFeeEstimateStatus,
} from "./transactions/fees/evm-fee-estimate"
export type { EvmTransactionReview } from "./transactions/review/evm-transaction-review"
export type {
  EvmTransactionHistoryItem,
  EvmTransactionHistoryStatus,
  NativeTransferHistoryItem,
  TokenApprovalHistoryItem,
  TokenTransferHistoryItem,
} from "./transactions/history/evm-transaction-history"
export type { EvmWriteStatus } from "./transactions/lifecycle/evm-write-status"

// Registry — read-only selectors. UI và feature không đọc registry JSON trực
// tiếp (decision 0001).
export {
  findEvmToken,
  getEvmTokensForChain,
  findEvmTokenBySymbol,
  getDefaultEvmNetwork,
  isEvmNetworkSupported,
  getEvmExplorerUrl,
  getAddressExplorerUrl,
  getTransactionExplorerUrl,
  getTokenExplorerUrl,
  type EvmExplorerLinkType,
} from "./chain/registry/evm-registry.adapter"
export {
  EVM_NETWORKS,
  getEvmNetworkExplorer,
  getEvmNetworkRpcUrl,
  getEvmNetworkNativeAsset,
  type AssetContractConfig,
  type EvmNetworkConfig,
} from "./chain/registry/evm-network.registry"

// Address presentation và validation. Implementation ở `./address`, cũng là
// public leaf path cho pure domain code không cần runtime.
export {
  isSameAddress,
  isValidAddress,
  isZeroAddress,
  isNativeTokenAddress,
  shortenAddress,
  truncateAddress,
  toChecksumAddress,
  parseChecksumAddress,
  toAddressKey,
  EVM_NATIVE_TOKEN_ADDRESS,
  EVM_ZERO_ADDRESS,
} from "./address"

// Reusable EVM components.
//
// Chúng hiểu trực tiếp EVM semantics (write status, review, network mismatch,
// balances). Generic primitive ở `@/components/ui`; component mang business
// semantics của một feature thuộc về chính feature đó (decision 0014).
export { BalanceCard } from "./components/balance/balance-card"
export { NetworkCard } from "./components/network/network-card"
export { UnsupportedNetworkCard } from "./components/network/unsupported-network-card"
export { WalletCard } from "./components/wallet/wallet-card"
export { TransferSection } from "./components/forms/transfer-section"
export { RecentTransactionsCard } from "./components/history/recent-transactions-card"
export { TransactionReviewCard } from "./components/common/transaction-review-card"
export { TransactionStatus } from "./components/common/transaction-status"
export { StatusBadge } from "./components/common/status-badge"

// Pending receipt reconciliation: headless, application mount ở đâu là quyết
// định của application.
export { PendingReceiptReconciler } from "./transactions/history/pending-receipt-reconciler"

// ---------------------------------------------------------------------------
// Tier B — Feature Extension API
//
// Đọc contract ở đầu file trước khi dùng. Mọi consumer phải giữ nguyên các
// invariant trong `0005`, `0008` và `0015`.
// ---------------------------------------------------------------------------

/**
 * Shared mechanical write safety: duplicate-submit guard, operation ownership,
 * stale-operation isolation, once-per-hash receipt handling.
 *
 * Đây KHÔNG phải write shortcut — hook chỉ giữ refs và throw khi vi phạm; nó
 * không tự gửi transaction. Feature vẫn tự sở hữu ABI, simulation, review,
 * history model và domain cache invalidation.
 */
export {
  useEvmWriteLifecycle,
  type UseEvmWriteLifecycleInput,
} from "./transactions/lifecycle/use-evm-write-lifecycle"

/** Guard bắt buộc trước mọi write: connected + supported chain. */
export { assertEvmWriteReady } from "./chain/selection/assert-evm-write-ready"

/** Derive terminal status từ receipt evidence, không từ hash. */
export {
  deriveEvmWriteStatus,
  type DeriveEvmWriteStatusInput,
} from "./transactions/lifecycle/evm-write-status"

/** Typed domain error. Feature không tự normalize Viem/Wagmi error. */
export {
  EvmWeb3Error,
  createEvmWeb3Error,
  type EvmErrorCode,
} from "./errors/evm-errors"
export {
  toEvmWeb3Error,
  toEvmWeb3ErrorOrNull,
  type EvmTransactionErrorPhase,
  type ToEvmWeb3ErrorOptions,
} from "./errors/evm-error.adapter"

/** Phân biệt user rejection với failure thật. */
export { isUserRejectedWalletRequest } from "./errors/evm-wallet-rejection"

/** Registry lookup dạng strict cho feature preflight (throw khi thiếu). */
export {
  getEvmToken,
  getEvmNetworkByKey,
  findEvmNetworkByChainId,
  getDefaultEvmChainId,
} from "./chain/registry/evm-registry.adapter"
