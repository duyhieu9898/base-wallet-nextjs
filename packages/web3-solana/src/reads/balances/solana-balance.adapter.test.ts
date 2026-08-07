import { describe, expect, it } from "vitest"

import type { SplTokenConfig } from "../../chain/registry/solana-registry.types"
import {
  LAMPORTS_DECIMALS,
  toNativeBalance,
  toTokenBalances,
  withMissingRegistryTokens,
  type ParsedTokenAccount,
} from "./solana-balance.adapter"

const USDC = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
const NRA = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"

const registry: SplTokenConfig[] = [
  {
    mint: USDC,
    name: "USD Coin",
    symbol: "USDC",
    expectedDecimals: 6,
    enabled: true,
  },
  {
    mint: NRA,
    name: "Neura",
    symbol: "NRA",
    expectedDecimals: 9,
    enabled: true,
  },
]

function account(overrides: Partial<ParsedTokenAccount> = {}) {
  return { mint: USDC, amount: "1000000", decimals: 6, ...overrides }
}

describe("toNativeBalance", () => {
  it("returns lamports as bigint with no mint", () => {
    expect(toNativeBalance(2_500_000_000)).toEqual({
      mint: null,
      symbol: "SOL",
      raw: 2_500_000_000n,
      decimals: LAMPORTS_DECIMALS,
    })
  })

  it("accepts a bigint without going through number", () => {
    // A u64 above Number.MAX_SAFE_INTEGER must survive intact.
    const huge = 9_007_199_254_740_993n

    expect(toNativeBalance(huge).raw).toBe(huge)
  })
})

describe("toTokenBalances", () => {
  it("sums multiple token accounts for the same mint", () => {
    // An owner can hold several accounts for one mint — the associated account
    // plus auxiliary ones. Taking only the first is the mistake this guards.
    const balances = toTokenBalances(
      [
        account({ amount: "1000000" }),
        account({ amount: "2500000" }),
        account({ amount: "500000" }),
      ],
      registry,
    )

    expect(balances).toHaveLength(1)
    expect(balances[0]?.raw).toBe(4_000_000n)
  })

  it("keeps mints apart", () => {
    const balances = toTokenBalances(
      [
        account({ mint: USDC, amount: "1000000" }),
        account({ mint: NRA, amount: "7", decimals: 9 }),
      ],
      registry,
    )

    expect(balances.map((balance) => balance.symbol).sort()).toEqual([
      "NRA",
      "USDC",
    ])
  })

  it("labels a mint the registry does not resolve", () => {
    // The service filters to registry mints before calling this, so reaching
    // here means the two went out of step. Labelling keeps that visible rather
    // than silently shortening the list.
    const balances = toTokenBalances(
      [account({ mint: "So11111111111111111111111111111111111111112" })],
      registry,
    )

    expect(balances[0]?.symbol).toBe("UNKNOWN")
  })

  it("uses on-chain decimals, not the registry's declared value", () => {
    const balances = toTokenBalances(
      [account({ mint: USDC, decimals: 2 })],
      registry,
    )

    expect(balances[0]?.decimals).toBe(2)
  })

  it("does not overflow on a u64-sized amount", () => {
    const balances = toTokenBalances(
      [account({ amount: "18446744073709551615" }), account({ amount: "1" })],
      registry,
    )

    expect(balances[0]?.raw).toBe(18_446_744_073_709_551_616n)
  })
})

describe("withMissingRegistryTokens", () => {
  it("adds a zero entry for a token the owner has no account for", () => {
    // On Solana a zero balance usually means no token account exists at all, so
    // the mint is simply absent from the RPC response. Without this the token
    // vanishes from the UI instead of showing 0.
    const balances = withMissingRegistryTokens(
      toTokenBalances([account({ mint: USDC })], registry),
      registry,
    )

    const nra = balances.find((balance) => balance.symbol === "NRA")

    expect(nra?.raw).toBe(0n)
    expect(nra?.decimals).toBe(9)
  })

  it("leaves held balances untouched", () => {
    const held = toTokenBalances([account({ amount: "42" })], registry)
    const balances = withMissingRegistryTokens(held, registry)

    expect(balances.find((balance) => balance.symbol === "USDC")?.raw).toBe(42n)
  })

  it("adds nothing when every registry token is held", () => {
    const held = toTokenBalances(
      [account({ mint: USDC }), account({ mint: NRA, decimals: 9 })],
      registry,
    )

    expect(withMissingRegistryTokens(held, registry)).toHaveLength(2)
  })
})
