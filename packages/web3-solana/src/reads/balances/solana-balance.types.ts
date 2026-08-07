/**
 * Balance model.
 *
 * `raw` is the integer amount in the asset's smallest unit — lamports for SOL,
 * base units for an SPL token — as `bigint`. Never a `number`: a u64 exceeds
 * `Number.MAX_SAFE_INTEGER`, and the loss is silent.
 *
 * `decimals` comes from the on-chain mint, not from the registry, so a
 * formatting step cannot use a value the chain disagrees with.
 */
export type SolanaAssetBalance = {
  /** `null` for native SOL, which has no mint account. */
  mint: string | null
  symbol: string
  raw: bigint
  decimals: number
}
