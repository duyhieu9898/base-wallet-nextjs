/**
 * Solana runtime — public boundary.
 *
 * Sibling of `@nln/web3-evm`, not a variant of it. No EVM type crosses over and
 * neither package imports the other; the shared vocabulary is the foundation
 * contract, not shared code.
 *
 * Dedicated public leaf paths exist for pure domain code:
 *
 * - `@nln/web3-solana/address`   (base58 address primitives)
 * - `@nln/web3-solana/errors`    (error taxonomy)
 * - `@nln/web3-solana/registry`  (pure registry read selectors)
 * - `@nln/web3-solana/config`    (runtime configuration injection)
 *
 * ## Current scope: reads only
 *
 * This package deliberately exports **no write surface** — no submission, no
 * confirmation, no transaction status, no history. That is not an oversight and
 * not work in progress: every one of those encodes a commitment level, and which
 * commitment counts as terminal evidence is item 3 of
 * `docs/foundation/solana-runtime-requirement.md`, which has not been decided.
 *
 * Adding a write hook before that decision would make it by default. Phase
 * boundary: `docs/plans/active/solana-runtime.md`.
 *
 * ## What has no counterpart here
 *
 * `@nln/web3-evm` exports allowance reads and an approval flow. Solana has no
 * ERC-20 spender model — an Anchor program signs with PDA authority — so there
 * is nothing to mirror and none is invented. This package being smaller than the
 * EVM one is the correct shape.
 */

// Runtime configuration injection lives at `@nln/web3-solana/config`, not here,
// so bootstrap and test-setup code can install a config without instantiating
// hook modules. Re-exporting it here would hand callers the import that defeats
// the leaf.

// Address primitives. Implementation at `./address`, also a public leaf path.
export {
  isSameAddress,
  isSignableAddress,
  isValidAddress,
  isValidSignature,
  shortenAddress,
  shortenSignature,
  SYSTEM_PROGRAM_ADDRESS,
  toAddressKey,
  WRAPPED_SOL_MINT,
} from "./address"

// Provider composition does NOT go through this barrel — see
// `@nln/web3-solana/provider`. Exporting it here would force every consumer of
// any hook to pull a Connection and the wallet adapter into its module graph.

// Selection — which account and cluster the screen operates on.
export { useSolanaSelection } from "./chain/selection/use-solana-selection"
export type {
  SolanaSelection,
  SolanaSelectionStatus,
} from "./chain/selection/solana-selection"

// Reads — balances.
export {
  useSolanaNativeBalance,
  useSolanaTokenBalances,
} from "./reads/balances/use-solana-balances"
export { useSolanaTokenList } from "./reads/balances/use-solana-token-list"
export type { SolanaAssetBalance } from "./reads/balances/solana-balance.types"

// Cluster identity check. Solana exposes no chain id, so "am I really on
// devnet?" is an RPC call rather than a local field.
export {
  assertSolanaClusterIdentity,
  SOLANA_READ_COMMITMENT,
} from "./clients/create-solana-connection"

// Registry — read-only selectors. UI and features do not read registry data
// directly.
export {
  findSolanaCluster,
  findSolanaToken,
  findSolanaTokenBySymbol,
  getAddressExplorerUrl,
  getAllSolanaClusters,
  getDefaultSolanaCluster,
  getSolanaCluster,
  getSolanaRpcUrl,
  getSolanaToken,
  getSolanaTokensForCluster,
  getTransactionExplorerUrl,
  isSolanaClusterSupported,
} from "./chain/registry"

export type {
  SolanaClusterConfig,
  SolanaClusterKey,
  SplTokenConfig,
} from "./chain/registry"

// Typed domain errors.
export {
  createSolanaWeb3Error,
  SolanaWeb3Error,
  type SolanaErrorCode,
} from "./errors"
