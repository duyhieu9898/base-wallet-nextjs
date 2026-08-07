/**
 * EVM runtime — public boundary.
 *
 * Applications and features import runtime APIs from `@nln/web3-evm`. Deep imports into
 * `@nln/web3-evm/**` are private internals and blocked by ESLint.
 *
 * Outside of this barrel, there are dedicated public leaf paths designed for pure domain code:
 *
 * - `@nln/web3-evm/address`          (pure address primitives)
 * - `@nln/web3-evm/errors`           (pure error taxonomy)
 * - `@nln/web3-evm/errors/adapter`   (Viem/Wagmi RPC error normalization)
 * - `@nln/web3-evm/contracts`        (generic contract deployment types & helpers)
 * - `@nln/web3-evm/registry`         (pure registry read selectors, incl. explorer URLs)
 * - `@nln/web3-evm/config`           (runtime configuration injection)
 * - `@nln/web3-evm/provider`         (EvmProvider & wagmi config adapter)
 *
 * Provider composition is located at `@/providers/web3-providers` — see note
 * under Tier A section below.
 *
 * Public surface is intentionally divided into two tiers:
 *
 * ## Tier A — Application API
 *
 * Hooks, types, and helpers directly used by UI/application. They encapsulate
 * all safety invariants of the foundation.
 *
 * ## Tier B — Feature Extension API
 *
 * Primitives for an application feature to implement its own contract-specific write
 * flow according to `docs/foundation/decisions/0015-feature-write-flows-and-approval-orchestration.md`.
 *
 * Tier B is **controlled** public, not an accidental export. Tier B consumers MUST:
 *
 * - perform `Prepare → Review → Confirm`, do not submit directly from UI;
 * - run simulation with connected account before opening wallet request;
 * - use `useEvmWriteLifecycle` as a guard for every submission;
 * - do not conclude success solely from transaction hash;
 * - maintain stale-operation protection when account/chain/token/spender changes;
 * - treat receipt as the sole terminal evidence for success/revert;
 * - keep side effects (callback, invalidation, history) once-per-hash.
 *
 * Features violating the above constraints weaken foundation safety invariants, which
 * `EXTENSION_CONTRACT.md` forbids.
 *
 * Not exported here: internal operation refs, low-level query keys,
 * invalidation implementation, storage internals, test helpers, and any
 * wrapper allowing submit bypassing review.
 */

// ---------------------------------------------------------------------------
// Tier A — Application API
// ---------------------------------------------------------------------------

// Provider composition DOES NOT go through this barrel.
//
// `EvmProvider` is composed at `@/providers/web3-providers` — the point where the application
// chooses which family runtime is mounted. Exporting it here would force every consumer of
// any hook to instantiate `wagmi.createConfig` at import time,
// pulling the entire runtime into module graphs that only need a pure helper.

// Selection / readiness.
export { useEvmSelection } from "./chain/selection/use-evm-selection"
export type {
  EvmSelection,
  EvmSelectionStatus,
} from "./chain/selection/evm-selection"

// Wallet and network.
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

// Writes — public transaction hooks (prepare/review/confirm packaged).
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

// Fees, receipt tracking, and history.
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

// Registry — read-only selectors. UI and features do not read registry JSON directly
// (decision 0001).
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
  getAllEvmNetworks,
  getEvmNetworkExplorer,
  getEvmNetworkRpcUrl,
  getEvmNetworkNativeAsset,
  type AssetContractConfig,
  type EvmNetworkConfig,
} from "./chain/registry/evm-network.registry"

// Runtime configuration injection lives at `@nln/web3-evm/config`, not here.
//
// That leaf is React-free and wagmi-free so bootstrap and test-setup code can
// install a config without instantiating hook modules. Re-exporting the same
// functions from this barrel would hand callers the import that defeats it.

// Address presentation and validation. Implementation at `./address`, which is also a
// public leaf path for pure domain code not requiring runtime.
export {
  isSameAddress,
  isValidAddress,
  isValidTransactionHash,
  isZeroAddress,
  isNativeTokenAddress,
  shortenAddress,
  shortenHash,
  truncateAddress,
  toChecksumAddress,
  parseChecksumAddress,
  toAddressKey,
  EVM_NATIVE_TOKEN_ADDRESS,
  EVM_ZERO_ADDRESS,
} from "./address"

// The foundation exports no presentation (decision 0014).
//
// Hooks, domain state, types, pure models and state derivation live here; anything
// that renders against a design system lives in the application, because the second
// consumer does not share this one. The EVM components previously exported from this
// barrel now live in `src/components/web3/evm/` and are composed by the application.

// Pending receipt reconciliation: headless, where to mount in application is the
// application's decision.
export { PendingReceiptReconciler } from "./transactions/history/pending-receipt-reconciler"

// ---------------------------------------------------------------------------
// Tier B — Feature Extension API
//
// Read contract at the top of the file before using. All consumers must preserve the
// invariants in `0005`, `0008`, and `0015`.
// ---------------------------------------------------------------------------

/**
 * Shared mechanical write safety: duplicate-submit guard, operation ownership,
 * stale-operation isolation, once-per-hash receipt handling.
 *
 * This is NOT a write shortcut — the hook only holds refs and throws on violation; it
 * does not send transactions itself. Features still own ABI, simulation, review,
 * history model, and domain cache invalidation.
 */
export {
  useEvmWriteLifecycle,
  type UseEvmWriteLifecycleInput,
} from "./transactions/lifecycle/use-evm-write-lifecycle"

/** Mandatory guard before any write: connected + supported chain. */
export { assertEvmWriteReady } from "./chain/selection/assert-evm-write-ready"

/** Derive terminal status from receipt evidence, not from hash. */
export {
  deriveEvmWriteStatus,
  type DeriveEvmWriteStatusInput,
} from "./transactions/lifecycle/evm-write-status"

/** Typed domain error. Features do not normalize Viem/Wagmi errors themselves. */
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

/** Distinguishes user rejection from real failure. */
export { isUserRejectedWalletRequest } from "./errors/evm-wallet-rejection"

/**
 * History side effect for feature write flows.
 *
 * `0012` requires EVERY write hook to save pending item upon receiving hash, and this
 * barrel has delegated `history model` to features — so features must have a means to record it.
 * This is a storage side effect, not a source of truth: caller wraps in `try/catch`
 * and does not let storage failure break submission.
 */
export {
  addEvmTransactionHistoryItem,
  updateEvmTransactionHistoryItem,
  // Exported so a feature can observe history without hardcoding the key. A
  // schema change bumps the version (0012), and a literal would read nothing.
  EVM_TRANSACTION_HISTORY_STORAGE_KEY,
} from "./transactions/history/evm-transaction-history.storage"
export type {
  ContractWriteHistoryItem,
  FeatureActivityRecord,
} from "./transactions/history/evm-transaction-history"

/**
 * Targeted invalidation after receipt success. Feature chooses `kind`; foundation
 * decides which query keys are affected to avoid invalidating the entire cache.
 */
export {
  buildEvmWriteInvalidationFilters,
  type EvmWriteKind,
  type EvmWriteInvalidationInput,
} from "./transactions/invalidation/evm-invalidation.adapter"

/** Strict registry lookup for feature preflight (throws when missing). */
export {
  getEvmToken,
  getEvmNetworkByKey,
  findEvmNetworkByChainId,
  getDefaultEvmChainId,
} from "./chain/registry/evm-registry.adapter"

export type { BaseContractDeployment } from "./contracts/contract-deployment.types"
export {
  readDeploymentParameters,
  validateDeploymentAddress,
} from "./contracts/hydrate-contract-deployments"
