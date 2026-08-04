/**
 * Typed EVM errors. Do not show the entire raw RPC error to the UI; keep the original error
 * in `cause` to debug. Wallet secrets never come through here.
 */
export type EvmErrorCode =
  | "NETWORK_NOT_FOUND"
  | "NETWORK_DISABLED"
  | "UNSUPPORTED_CHAIN"
  | "CHAIN_MISMATCH"
  | "SELECTION_NOT_READY"
  | "INVALID_ADDRESS"
  | "TOKEN_NOT_CONFIGURED"
  | "CONTRACT_READ_FAILED"
  | "ASSET_NOT_FOUND"
  | "CONTRACT_NOT_DEPLOYED"
  | "TOKEN_METADATA_MISMATCH"
  | "INVALID_RECIPIENT"
  | "INVALID_AMOUNT"
  | "INSUFFICIENT_FUNDS"
  | "NONCE_TOO_LOW"
  | "SIMULATION_FAILED"
  /** Contract revert detected in simulation step: not yet broadcast, not hashed, not consuming gas. */
  | "SIMULATION_REVERTED"
  | "TRANSACTION_FAILED"
  | "RPC_REQUEST_FAILED"
  | "TRANSACTION_REJECTED"
  /** Transaction has been sent and reverted when executed: hash, gas consumed. */
  | "TRANSACTION_REVERTED"

type EvmWeb3ErrorOptions = {
  code: EvmErrorCode
  message: string
  cause?: unknown
}

export class EvmWeb3Error extends Error {
  readonly code: EvmErrorCode
  override readonly cause: unknown

  constructor({ code, message, cause }: EvmWeb3ErrorOptions) {
    super(message)
    this.name = "EvmWeb3Error"
    this.code = code
    this.cause = cause
  }
}

export function createEvmWeb3Error(
  code: EvmErrorCode,
  message: string,
  cause?: unknown,
): EvmWeb3Error {
  return new EvmWeb3Error({ code, message, cause })
}
