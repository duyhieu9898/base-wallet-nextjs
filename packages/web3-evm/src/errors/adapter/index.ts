/**
 * EVM error normalization adapter — public leaf entrypoint (`@nln/web3-evm/errors/adapter`).
 *
 * Normalizes Viem/Wagmi RPC errors into foundation `EvmWeb3Error` taxonomy
 * and detects wallet user rejections across EIP-1193 connector shapes.
 */
export {
  toEvmWeb3Error,
  toEvmWeb3ErrorOrNull,
  type EvmTransactionErrorPhase,
  type ToEvmWeb3ErrorOptions,
} from "../evm-error.adapter"

export { isUserRejectedWalletRequest } from "../evm-wallet-rejection"
