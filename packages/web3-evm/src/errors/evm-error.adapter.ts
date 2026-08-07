import {
  BaseError,
  ChainMismatchError,
  ContractFunctionRevertedError,
  InsufficientFundsError,
} from "viem"

import {
  createEvmWeb3Error,
  type EvmErrorCode,
  EvmWeb3Error,
} from "./evm-errors"
import { isUserRejectedWalletRequest } from "./evm-wallet-rejection"

export type EvmTransactionErrorPhase = "simulation" | "submission" | "receipt"

export type ToEvmWeb3ErrorOptions = {
  phase?: EvmTransactionErrorPhase
}

function resolveGenericErrorCode(
  phase: EvmTransactionErrorPhase,
): EvmErrorCode {
  switch (phase) {
    case "submission":
      return "TRANSACTION_FAILED"
    case "receipt":
      return "RPC_REQUEST_FAILED"
    case "simulation":
    default:
      return "SIMULATION_FAILED"
  }
}

/**
 * Convert viem/wagmi's raw error to `EvmWeb3Error` with `code` and `phase` context.
 *
 * Viem's error is `BaseError` with multi-line message including `Details:`,
 * `Version: viem@x.y.z` and sometimes even the request payload — are not appropriate to include
 * straight to the UI. This function derives the actual cause via `walk()`, returning a short message,
 * and keep the original error in `cause` for debugging.
 */
export function toEvmWeb3Error(
  cause: unknown,
  options?: ToEvmWeb3ErrorOptions,
): EvmWeb3Error {
  if (cause instanceof EvmWeb3Error) {
    return cause
  }

  const phase = options?.phase ?? "simulation"

  if (isUserRejectedWalletRequest(cause)) {
    return createEvmWeb3Error(
      "TRANSACTION_REJECTED",
      "Transaction was rejected in wallet.",
      cause,
    )
  }

  if (cause instanceof BaseError) {
    const reverted = cause.walk(
      (error) => error instanceof ContractFunctionRevertedError,
    )
    if (reverted instanceof ContractFunctionRevertedError) {
      return createEvmWeb3Error(
        resolveContractExecutionErrorCode(phase),
        describeContractExecutionError(reverted, phase),
        cause,
      )
    }

    if (cause.walk((error) => error instanceof InsufficientFundsError)) {
      return createEvmWeb3Error(
        "INSUFFICIENT_FUNDS",
        "Insufficient balance to pay for gas and transaction value.",
        cause,
      )
    }

    if (cause.walk((error) => error instanceof ChainMismatchError)) {
      return createEvmWeb3Error(
        "CHAIN_MISMATCH",
        "Wallet is connected to a different chain. Please switch network.",
        cause,
      )
    }

    // Nonce too low / replacement underpriced — no separate class in viem,
    // identified via shortMessage
    const nonceLow = /nonce too low|replacement transaction underpriced/i
    if (nonceLow.test(cause.shortMessage)) {
      return createEvmWeb3Error(
        "NONCE_TOO_LOW",
        "Nonce too low or transaction already submitted. Please try again.",
        cause,
      )
    }

    return createEvmWeb3Error(
      resolveGenericErrorCode(phase),
      cause.shortMessage || cause.message,
      cause,
    )
  }

  if (cause instanceof Error) {
    return createEvmWeb3Error(
      resolveGenericErrorCode(phase),
      sanitizeErrorMessage(cause.message),
      cause,
    )
  }

  return createEvmWeb3Error(
    resolveGenericErrorCode(phase),
    "Transaction failed due to an unknown error.",
    cause,
  )
}

function sanitizeErrorMessage(message: string): string {
  return message.split("\n")[0]?.trim() || "Transaction failed."
}

/**
 * `ContractFunctionRevertedError` only says that contract call revert, not
 * Is the transaction on the chain or not? That evidence lies in phase:
 *
 * - `simulation`: not broadcast yet, no hashing, no gas consumption.
 * - `submission`: `writeContract` throw before returning hash — error may come from
 *   wallet preflight, internal `eth_estimateGas` or provider refused to send. App
 *   There is no hash yet so it cannot be confirmed that the transaction has been mined.
 * - `receipt`: has hash and receipt, this is the real mined revert.
 */
function resolveContractExecutionErrorCode(
  phase: EvmTransactionErrorPhase,
): EvmErrorCode {
  switch (phase) {
    case "simulation":
      return "SIMULATION_REVERTED"
    case "receipt":
      return "TRANSACTION_REVERTED"
    case "submission":
    default:
      return "TRANSACTION_FAILED"
  }
}

function getContractExecutionErrorPrefix(
  phase: EvmTransactionErrorPhase,
): string {
  switch (phase) {
    case "simulation":
      return "Simulation reverted"
    case "receipt":
      return "Transaction reverted"
    case "submission":
    default:
      return "Transaction submission failed"
  }
}

/**
 * Prioritize the reason for revert provided by the contract; only falls back to general messages when
 * The contract does not pay any reason. Fallback separates by phase to message no
 * Assert that the transaction has been executed on-chain without evidence.
 */
function describeContractExecutionError(
  error: ContractFunctionRevertedError,
  phase: EvmTransactionErrorPhase,
): string {
  const prefix = getContractExecutionErrorPrefix(phase)

  if (error.reason) {
    return `${prefix}: ${error.reason}`
  }
  if (error.data?.errorName) {
    return `${prefix}: ${error.data.errorName}`
  }

  switch (phase) {
    case "simulation":
      return "Contract simulation reverted."
    case "receipt":
      return "Transaction reverted by contract."
    case "submission":
    default:
      return "Transaction submission failed because the contract call reverted."
  }
}

/**
 * Nullable form used for query/mutation error (`simulate.error`,
 * `receipt.error`) — hook returns `null` when there is no error.
 */
export function toEvmWeb3ErrorOrNull(
  cause: unknown,
  options?: ToEvmWeb3ErrorOptions,
): EvmWeb3Error | null {
  if (cause === null || cause === undefined) return null
  return toEvmWeb3Error(cause, options)
}
