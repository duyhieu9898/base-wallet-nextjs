/**
 * Cluster registry read selectors — public leaf entrypoint
 * (`@nln/web3-solana/registry`).
 *
 * Pure functions over the injected config. React-free and adapter-free.
 */
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
  type SolanaExplorerLinkType,
} from "./solana-registry.adapter"

export type {
  ExplorerConfig,
  FaucetConfig,
  SolanaClusterConfig,
  SolanaClusterKey,
  SplTokenConfig,
} from "./solana-registry.types"
