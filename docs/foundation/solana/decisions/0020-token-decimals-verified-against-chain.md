# 0020 Token decimals are verified against the on-chain mint

## Purpose

The product specification records a specific failure: skipping the decimal
conversion between a stake token and a reward token underpays rewards by a factor
of 1,000 **with no error raised**.

A registry that declares decimals the chain disagrees with produces exactly that
outcome. Every amount rendered or submitted for the token is wrong by a power of
ten, and nothing surfaces.

## Decision

`fetchTokenBalances` compares each held token's on-chain `decimals` against the
registry's `expectedDecimals` and raises `TOKEN_METADATA_MISMATCH` when they
differ.

It throws for the whole read rather than dropping the offending token, because a
wrong `expectedDecimals` means every amount for that token is wrong — including
the zero-filled entries, which never touch chain data and so cannot be checked
individually.

The check runs **outside** the try/catch that wraps the RPC call. Wrapping it
would report a configuration error as `ACCOUNT_READ_FAILED`, sending the reader
to look at the network.

## Relationship to the EVM runtime

This goes **further** than `@nln/web3-evm`. Its `hydrateTokens` validates the
_shape_ of `expectedDecimals` at boot — integer, non-negative — and never
compares it against the ERC-20 contract.

An earlier version of the Solana requirement record claimed the EVM registry did
perform this comparison. It does not; the claim was corrected rather than copied.

Whether `@nln/web3-evm` should gain the same check is a separate question. It is
raised in the requirement record and deliberately not answered here, because
changing the EVM runtime is out of scope for Solana work.

## Required behavior

- Construction-time validation still rejects a non-integer `expectedDecimals`, a
  mint that is not a valid address, and a token keyed by an address other than
  its own mint. Boot-time failure is preferred where it is possible.
- On-chain comparison covers what boot-time validation cannot: the chain is not
  reachable at config construction.

## Verification

Mutation-tested against live devnet: setting USDC to 9 decimals in
`apps/neura/src/config/solana.config.ts` produces

```text
SolanaWeb3Error: Token "USDC" on cluster "devnet" declares 9 decimals
but mint 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU reports 6.
code: 'TOKEN_METADATA_MISMATCH'
```

## Code

- `packages/web3-solana/src/reads/balances/solana-balance.service.ts`
  (`assertRegistryDecimalsMatchChain`)
- `packages/web3-solana/src/chain/registry/solana-runtime-config.ts`
  (construction-time validation)
