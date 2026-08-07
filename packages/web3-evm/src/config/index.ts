/**
 * Public leaf entrypoint for consumer configuration (`@nln/web3-evm/config`).
 *
 * React-free and wagmi-free, like `./address` and `./errors`: an application
 * builds and installs its `EvmRuntimeConfig` here without pulling the EVM
 * runtime, its hooks, or a Wagmi client into the module graph. That matters for
 * bootstrap code and for test setup, where importing the main barrel would
 * instantiate hook modules before a test can substitute them.
 *
 * The package owns the schema and the validator; the application owns the data.
 */

export {
  configureEvmRuntime,
  createEvmRuntimeConfig,
  getEvmRuntimeConfig,
  isEvmRuntimeConfigured,
  resetEvmRuntime,
  type EvmRuntimeConfig,
} from "../chain/registry/evm-runtime-config"

export { hydrateTokens } from "../chain/registry/evm-network.registry"

export type {
  AssetContractConfig,
  EvmNetworkConfig,
} from "../chain/registry/evm-registry.types"
