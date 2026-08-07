/**
 * Public leaf entrypoint for consumer configuration
 * (`@nln/web3-solana/config`).
 *
 * React-free and adapter-free, like `./address`, `./errors` and `./registry`: an
 * application builds and installs its `SolanaRuntimeConfig` here without pulling
 * the runtime, its hooks, or a `Connection` into the module graph. That matters
 * for bootstrap code and for test setup, where importing the main barrel would
 * instantiate hook modules before a test can substitute them.
 *
 * The package owns the schema and the validator; the application owns the data.
 */

export {
  configureSolanaRuntime,
  createSolanaRuntimeConfig,
  getSolanaRuntimeConfig,
  isSolanaRuntimeConfigured,
  resetSolanaRuntime,
  type SolanaRuntimeConfig,
} from "../chain/registry/solana-runtime-config"

export type {
  SolanaClusterConfig,
  SolanaClusterKey,
  SplTokenConfig,
} from "../chain/registry/solana-registry.types"
