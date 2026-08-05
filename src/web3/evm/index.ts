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
export { useEvmSelection } from "./selection/use-evm-selection"
export type {
  EvmSelection,
  EvmSelectionStatus,
} from "./selection/evm-selection"

// Wallet và network.
export { useEvmWallet } from "./hooks/use-evm-wallet"
export { useEvmNetwork } from "./hooks/use-evm-network"

// Reads — balances.
export { useEvmNativeBalance } from "./hooks/use-evm-native-balance"
export { useEvmTokenBalance } from "./hooks/use-evm-token-balance"
export { useEvmBalances } from "./hooks/use-evm-balances"
export { useEvmTokenList } from "./hooks/use-evm-token-list"

// Reads — allowances.
export { useEvmAllowance } from "./hooks/use-evm-allowance"
export {
  useEvmAllowances,
  type EvmRejectedToken,
} from "./hooks/use-evm-allowances"

// Writes — public transaction hooks (prepare/review/confirm đã đóng gói).
export {
  useSendEvmNative,
  type UseSendEvmNativeInput,
} from "./hooks/use-send-evm-native"
export {
  useSendEvmToken,
  type UseSendEvmTokenInput,
} from "./hooks/use-send-evm-token"
export {
  useApproveEvmToken,
  type UseApproveEvmTokenInput,
} from "./hooks/use-approve-evm-token"

// Fees, receipt tracking và history.
export {
  useEvmFeeEstimate,
  type EvmFeeEstimateTarget,
} from "./hooks/use-evm-fee-estimate"
export { useEvmTransactionReceipt } from "./hooks/use-evm-transaction-receipt"
export {
  useEvmTransactionHistory,
  type UseEvmTransactionHistoryOptions,
} from "./hooks/use-evm-transaction-history"

// Public domain types.
export type {
  EvmAssetBalance,
  EvmTransactionReference,
  EvmWalletConnection,
} from "./types/evm-domain"
export type {
  EvmFeeEstimate,
  EvmFeeEstimateStatus,
} from "./types/evm-fee-estimate"
export type { EvmTransactionReview } from "./types/evm-transaction-review"
export type {
  EvmTransactionHistoryItem,
  EvmTransactionHistoryStatus,
  NativeTransferHistoryItem,
  TokenApprovalHistoryItem,
  TokenTransferHistoryItem,
} from "./types/evm-transaction-history"
export type { EvmWriteStatus } from "./types/evm-write-status"

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
} from "./adapters/evm-registry.adapter"
export {
  EVM_NETWORKS,
  getEvmNetworkExplorer,
  getEvmNetworkRpcUrl,
  getEvmNetworkNativeAsset,
  type AssetContractConfig,
  type EvmNetworkConfig,
} from "./registry/evm-network.registry"

// Address presentation và validation.
//
// TODO(phase-3): các helper này hiện sống ở `@/web3/core/address.utils` nhưng
// mang EVM address semantics. Phase 3 chuyển chúng về EVM owner; consumer đã
// import qua `@/web3/evm` nên việc di chuyển không tạo breaking change.
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
} from "@/web3/core/address.utils"

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
} from "./hooks/use-evm-write-lifecycle"

/** Guard bắt buộc trước mọi write: connected + supported chain. */
export { assertEvmWriteReady } from "./selection/assert-evm-write-ready"

/** Derive terminal status từ receipt evidence, không từ hash. */
export {
  deriveEvmWriteStatus,
  type DeriveEvmWriteStatusInput,
} from "./types/evm-write-status"

/** Typed domain error. Feature không tự normalize Viem/Wagmi error. */
export { EvmWeb3Error, createEvmWeb3Error, type EvmErrorCode } from "./errors"
export {
  toEvmWeb3Error,
  toEvmWeb3ErrorOrNull,
  type EvmTransactionErrorPhase,
  type ToEvmWeb3ErrorOptions,
} from "./adapters/evm-error.adapter"

/** Phân biệt user rejection với failure thật. */
export { isUserRejectedWalletRequest } from "./adapters/evm-wallet-rejection"

/** Registry lookup dạng strict cho feature preflight (throw khi thiếu). */
export {
  getEvmToken,
  getEvmNetworkByKey,
  findEvmNetworkByChainId,
  getDefaultEvmChainId,
} from "./adapters/evm-registry.adapter"
