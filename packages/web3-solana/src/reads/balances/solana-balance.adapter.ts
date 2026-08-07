/**
 * Pure shaping of RPC responses into the balance model. No network here — see
 * `solana-balance.service.ts` for the calls.
 *
 * Split out so the parsing, which is where the mistakes live, is testable
 * without a cluster.
 */

import type { SolanaAssetBalance } from "./solana-balance.types"
import type { SplTokenConfig } from "../../chain/registry/solana-registry.types"

/** Native SOL is fixed at 9 decimals. */
export const LAMPORTS_DECIMALS = 9

export function toNativeBalance(lamports: number | bigint): SolanaAssetBalance {
  return {
    mint: null,
    symbol: "SOL",
    // `getBalance` returns a JS number. Lamport balances stay far below
    // 2^53 in practice, but the conversion goes through the integer form so
    // nothing downstream has to think about it again.
    raw: BigInt(lamports),
    decimals: LAMPORTS_DECIMALS,
  }
}

export type ParsedTokenAccount = {
  mint: string
  amount: string
  decimals: number
}

/**
 * Collapse an owner's token accounts into one balance per mint.
 *
 * An owner can hold **several** token accounts for the same mint — the
 * associated token account plus any auxiliary ones. The EVM model has no
 * equivalent, where a balance is a single mapping entry, so summing is easy to
 * forget and produces a balance that is quietly too low.
 */
export function toTokenBalances(
  accounts: readonly ParsedTokenAccount[],
  registryTokens: readonly SplTokenConfig[],
): SolanaAssetBalance[] {
  const bySymbol = new Map(
    registryTokens.map((token) => [token.mint, token] as const),
  )

  const totals = new Map<string, { raw: bigint; decimals: number }>()

  for (const account of accounts) {
    const existing = totals.get(account.mint)

    totals.set(account.mint, {
      raw: (existing?.raw ?? 0n) + BigInt(account.amount),
      decimals: account.decimals,
    })
  }

  // The caller filters to registry mints before this point, so an unresolved
  // symbol means the two went out of step rather than that the owner holds
  // something exotic. It is labelled instead of dropped so the inconsistency is
  // visible rather than silently reducing the list.
  return [...totals].map(([mint, total]) => ({
    mint,
    symbol: bySymbol.get(mint)?.symbol ?? "UNKNOWN",
    raw: total.raw,
    decimals: total.decimals,
  }))
}

/**
 * Registry tokens the owner holds no account for.
 *
 * On Solana an owner with zero of a token usually has **no token account at
 * all**, so it is simply absent from the RPC response rather than present with
 * zero. Without this, a configured token disappears from the UI instead of
 * showing 0.
 */
export function withMissingRegistryTokens(
  balances: readonly SolanaAssetBalance[],
  registryTokens: readonly SplTokenConfig[],
): SolanaAssetBalance[] {
  const held = new Set(balances.map((balance) => balance.mint))

  const missing = registryTokens
    .filter((token) => !held.has(token.mint))
    .map<SolanaAssetBalance>((token) => ({
      mint: token.mint,
      symbol: token.symbol,
      raw: 0n,
      // No account exists, so there is no on-chain decimals value to read. The
      // registry's declared value is the only source available here.
      decimals: token.expectedDecimals,
    }))

  return [...balances, ...missing]
}
