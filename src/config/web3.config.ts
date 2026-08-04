import { sepolia } from "viem/chains"

/**
 * Parse chain default ID from env.
 *
 * Absent → use fallback. Present but not a positive integer → throw:
 * misspelled env cannot silently run on a different chain than intended.
 * (Chain IDs that are valid but not in the registry get a separate fail-fast registry.)
 */
export function resolveDefaultEvmChainId(
  raw: string | undefined,
  fallbackChainId: number = sepolia.id,
): number {
  if (raw === undefined || raw.trim() === "") {
    return fallbackChainId
  }

  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `NEXT_PUBLIC_DEFAULT_CHAIN_ID must be a positive integer chain ID, received "${raw}".`,
    )
  }

  return parsed
}

/**
 * Lean Central Web3 Configuration.
 *
 * The Registry (`EVM_NETWORKS`) is the only source that identifies supported networks; here
 * Just choose the default network among them. Default chain is in env because dev and
 * production runs on different chains.
 */
export const web3Config = {
  defaultEvmChainId: resolveDefaultEvmChainId(
    process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID,
  ),
}
