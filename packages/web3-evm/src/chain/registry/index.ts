/**
 * Registry read selectors — public leaf entrypoint (`@nln/web3-evm/registry`).
 *
 * Same rationale as `./address` and `./errors`: this module is **React-free and
 * wagmi-free**, so code that only needs to resolve chain metadata — an explorer
 * URL for a table cell, a network name for a label — can use it without pulling
 * the EVM runtime, its hooks, and a Wagmi client into the module graph.
 *
 * The admin applications are the concrete case: they render wallet addresses and
 * transaction hashes as explorer links, but never connect a wallet. Routing them
 * through the runtime barrel would force `wagmi` and `@tanstack/react-query` into
 * a deployment that mounts no provider.
 *
 * Only read selectors live here. Write flows, hooks, and anything with a React
 * dependency stay behind the runtime barrel `@nln/web3-evm`. The consumer still
 * installs its configuration through `@nln/web3-evm/config` first — these
 * selectors read the installed registry and throw when none is installed.
 */

export {
  findEvmNetworkByChainId,
  findEvmNetworkByKey,
  findEvmToken,
  findEvmTokenBySymbol,
  getAddressExplorerUrl,
  getAllEvmNetworks,
  getBlockExplorerUrl,
  getDefaultEvmChainId,
  getDefaultEvmNetwork,
  getEvmExplorerUrl,
  getEvmNetworkByChainId,
  getEvmNetworkByKey,
  getEvmNetworkExplorer,
  getEvmNetworkNativeAsset,
  getEvmTokensForChain,
  getTokenExplorerUrl,
  getTransactionExplorerUrl,
  isEvmNetworkSupported,
  type EvmExplorerLinkType,
} from "./evm-registry.adapter"

export type {
  AssetContractConfig,
  EvmNetworkConfig,
} from "./evm-registry.types"

export type { ExplorerConfig } from "./registry.types"
