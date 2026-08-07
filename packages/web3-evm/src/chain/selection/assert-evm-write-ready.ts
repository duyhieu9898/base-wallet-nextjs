import { createEvmWeb3Error } from "../../errors/evm-errors"
import type { EvmSelection } from "./evm-selection"

/**
 * Pure assertion guard to ensure the wallet and EVM network are ready to perform transactions.
 *
 * Throws:
 * - `UNSUPPORTED_CHAIN` when the wallet is on a chain is not supported by the registry.
 * - `SELECTION_NOT_READY` when the wallet is not connected or has not yet resolved the chainId.
 */
export function assertEvmWriteReady(
  selection: EvmSelection,
): asserts selection is Extract<EvmSelection, { status: "ready" }> {
  if (selection.status === "ready") {
    return
  }

  if (selection.status === "unsupported") {
    throw createEvmWeb3Error(
      "UNSUPPORTED_CHAIN",
      "Selected EVM network is unsupported for transaction writes.",
    )
  }

  throw createEvmWeb3Error(
    "SELECTION_NOT_READY",
    "Selected EVM network is not ready for transaction writes.",
  )
}
