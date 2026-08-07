/**
 * EVM error taxonomy — pure public leaf entrypoint (`@nln/web3-evm/errors`).
 *
 * This module is **100% pure TypeScript (React-free, wagmi-free, viem-free)**,
 * so pure domain code can construct/inspect `EvmWeb3Error` without pulling any library into the module graph.
 *
 * Viem/Wagmi error normalization helpers live in `@nln/web3-evm/errors/adapter`.
 */
export {
  EvmWeb3Error,
  createEvmWeb3Error,
  type EvmErrorCode,
} from "./evm-errors"
