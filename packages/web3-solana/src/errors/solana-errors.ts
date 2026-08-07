/**
 * Typed Solana errors. Raw RPC payloads never reach the UI; the original is kept
 * in `cause` for debugging. Wallet secrets never travel through here.
 *
 * This is a public leaf entrypoint (`@nln/web3-solana/errors`): React-free and
 * adapter-free, so pure domain code can use it without pulling the Solana
 * runtime into its module graph.
 *
 * The code list is deliberately NOT a copy of `EvmErrorCode`. Codes exist here
 * only where Solana has the corresponding failure:
 *
 * - no `NONCE_TOO_LOW` — Solana orders by blockhash recency, not by nonce;
 * - no allowance/approval codes — there is no spender model to fail against;
 * - `BLOCKHASH_EXPIRED` and `ACCOUNT_NOT_FOUND` have no EVM counterpart.
 *
 * Write-phase codes are absent on purpose. Anything describing submission or
 * confirmation outcome encodes the commitment policy that item 3 of
 * `docs/foundation/solana-runtime-requirement.md` has not decided, so it is
 * added with the write lifecycle, not ahead of it.
 */

export type SolanaErrorCode =
  /** Registry read before the consumer injected its runtime config. */
  | "RUNTIME_NOT_CONFIGURED"
  | "CLUSTER_NOT_FOUND"
  | "CLUSTER_MISMATCH"
  | "SELECTION_NOT_READY"
  | "INVALID_ADDRESS"
  /** Base58 signature that is not a valid 64-byte signature. */
  | "INVALID_SIGNATURE"
  | "TOKEN_NOT_CONFIGURED"
  | "ASSET_NOT_FOUND"
  /** Address is valid but no account exists at it on the selected cluster. */
  | "ACCOUNT_NOT_FOUND"
  | "TOKEN_METADATA_MISMATCH"
  | "INVALID_RECIPIENT"
  | "INVALID_AMOUNT"
  | "INSUFFICIENT_FUNDS"
  | "ACCOUNT_READ_FAILED"
  | "RPC_REQUEST_FAILED"

type SolanaWeb3ErrorOptions = {
  code: SolanaErrorCode
  message: string
  cause?: unknown
}

export class SolanaWeb3Error extends Error {
  readonly code: SolanaErrorCode
  override readonly cause: unknown

  constructor({ code, message, cause }: SolanaWeb3ErrorOptions) {
    super(message)
    this.name = "SolanaWeb3Error"
    this.code = code
    this.cause = cause
  }
}

export function createSolanaWeb3Error(
  code: SolanaErrorCode,
  message: string,
  cause?: unknown,
): SolanaWeb3Error {
  return new SolanaWeb3Error({ code, message, cause })
}
