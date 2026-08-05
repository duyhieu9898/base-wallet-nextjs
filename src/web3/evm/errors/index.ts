/**
 * EVM error taxonomy — public leaf entrypoint.
 *
 * Đây là một trong số ít public path ngoài `@/web3/evm`. Lý do tồn tại giống
 * `@/web3/evm/address`: module này **React-free và wagmi-free**, nên pure domain
 * code dùng được mà không kéo toàn bộ EVM runtime vào module graph.
 *
 * Runtime barrel `@/web3/evm` cũng re-export các symbol này cho React code.
 */
export {
  EvmWeb3Error,
  createEvmWeb3Error,
  isUserRejectedWalletRequest,
  type EvmErrorCode,
} from "./evm-errors"
export {
  toEvmWeb3Error,
  toEvmWeb3ErrorOrNull,
  type EvmTransactionErrorPhase,
  type ToEvmWeb3ErrorOptions,
} from "./evm-error.adapter"
