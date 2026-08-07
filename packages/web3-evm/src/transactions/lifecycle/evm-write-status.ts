import type { EvmWeb3Error } from "../../errors/evm-errors"

export type EvmWriteStatus =
  | "idle"
  | "simulating"
  | "ready"
  | "awaiting-signature"
  | "confirming"
  | "success"
  | "reverted"
  | "rejected"
  | "error"

export type DeriveEvmWriteStatusInput = {
  hasPreparedRequest?: boolean
  isSimulating?: boolean
  /** true when ready to submit: for native it is after prepare(); with token/approval is after simulation success */
  isReadyToSubmit?: boolean
  isWriting?: boolean
  hash?: string | null
  receiptStatus?: "success" | "reverted" | null
  error?: EvmWeb3Error | null
}

/**
 * Infers unified `EvmWriteStatus` for write hooks.
 */
export function deriveEvmWriteStatus(
  input: DeriveEvmWriteStatusInput,
): EvmWriteStatus {
  const {
    hasPreparedRequest = false,
    isSimulating = false,
    isReadyToSubmit = false,
    isWriting = false,
    hash = null,
    receiptStatus = null,
    error = null,
  } = input

  if (receiptStatus === "success") {
    return "success"
  }

  // Receipt is the only proof of terminal on-chain status. Error code self
  // it does not prove that the transaction has been executed — even if there is a hash, just the hash
  // Says the transaction is submitted, not the execution result. "reverted" inference
  // from the code will cause the UI to notify mined revert for transactions that have never been on the chain.
  if (receiptStatus === "reverted") {
    return "reverted"
  }

  if (error?.code === "TRANSACTION_REJECTED") {
    return "rejected"
  }

  if (error !== null) {
    return "error"
  }

  if (hash !== null) {
    return "confirming"
  }

  if (isWriting) {
    return "awaiting-signature"
  }

  if (isSimulating) {
    return "simulating"
  }

  if (hasPreparedRequest && isReadyToSubmit) {
    return "ready"
  }

  return "idle"
}
