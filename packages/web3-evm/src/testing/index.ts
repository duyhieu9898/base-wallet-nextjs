/**
 * Verification helpers for the foundation (`@nln/web3-evm/testing`).
 *
 * Not part of the runtime API: nothing an application renders should import
 * this. It exists so live verification of the package lives with the package
 * rather than being reimplemented by every consumer (execution plan §8.3).
 */

export {
  runEvmSmoke,
  type EvmSmokeOptions,
  type EvmSmokeRow,
  type EvmSmokeSummary,
} from "./evm-smoke"
