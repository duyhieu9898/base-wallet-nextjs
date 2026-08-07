# 0019 Balance reads are registry-driven

## Purpose

Solana exposes an owner's holdings directly: `getParsedTokenAccountsByOwner`
returns every token account in one call. That makes "show what the wallet holds"
the path of least resistance, and it is the shape the Uniswap reference uses.

It is the wrong shape for this product, and the first implementation here took it
by mistake.

## Decision

Balance reads return exactly one entry per **enabled registry token**, plus the
native balance. Never more.

This matches `@nln/web3-evm`, which builds its balance calls from
`getEvmTokensForChain` and never enumerates wallet holdings. The application's
asset set is the registry; the wallet's contents are not a source of truth about
what this product supports.

The RPC call is still "by owner" rather than one call per mint, because that is a
single round trip. The registry filter is applied to the response.

## Required behavior

- Mints absent from the registry are discarded, not labelled and shown.
- A registry token the owner has no account for is returned with `raw: 0n`. On
  Solana a zero balance usually means **no token account exists**, so the mint is
  simply missing from the RPC response. Without zero-filling, a configured token
  disappears from the UI instead of showing 0.
- Multiple token accounts for the same mint are **summed**. An owner can hold the
  associated token account plus auxiliary ones. The EVM model has no equivalent —
  a balance there is a single mapping entry — so taking the first account is an
  easy mistake that produces a balance quietly too low.
- Amounts are `bigint`. A u64 exceeds `Number.MAX_SAFE_INTEGER` and the loss is
  silent.
- Only the SPL Token program is queried. Token-2022 is excluded: the product
  requirement states it is not supported.

## Evidence

Against a live devnet account, the enumerate-the-wallet version returned 267
entries — 266 of them `UNKNOWN`. The registry-driven version returns 1, in 198ms.

## Code and tests

Implementation:

- `packages/web3-solana/src/reads/balances/solana-balance.service.ts`
- `packages/web3-solana/src/reads/balances/solana-balance.adapter.ts`
- `packages/web3-solana/src/reads/balances/use-solana-token-list.ts`

Tests:

- `packages/web3-solana/src/reads/balances/solana-balance.adapter.test.ts` —
  summing, zero-fill, u64 range, on-chain decimals precedence.
