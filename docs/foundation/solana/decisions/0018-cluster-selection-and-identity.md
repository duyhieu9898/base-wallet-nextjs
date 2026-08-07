# 0018 Cluster selection and identity

## Purpose

A wallet-connected screen must know which account and which network it is
operating on before it reads or writes anything. The EVM runtime answers this
with `EvmSelection`, which includes an `unsupported` state for a wallet sitting
on a chain the application does not support.

Solana cannot reuse that model, and copying it would encode a state that can
never occur.

## Decision

`SolanaSelection` has three states: `disconnected`, `connecting`, `ready`. There
is no `unsupported`.

A Solana wallet reports no cluster. It signs whatever transaction it is handed,
against whichever RPC endpoint the **application** connected to. The cluster is
therefore always the application's choice and can never disagree with the wallet.

`cluster` is non-null in every state, including `disconnected`, so a signed-out
screen can still resolve explorer links and token metadata without a null check
at each call site. This differs from `EvmSelection`, where `network` is null in
`connecting` and `unsupported`.

## Required behavior

- The selected cluster comes from the injected runtime config, never from the
  wallet.
- `connecting` covers both the open wallet prompt and the window where the
  adapter reports connected but has not yet exposed a public key. Treating that
  window as `ready` hands `null` to a read as an owner address.
- There is no `chainId` anywhere in the package. A cluster is identified by its
  key in the registry and, on chain, by its genesis hash.

## Consequence: the risk moves rather than disappearing

Nothing stops an endpoint labelled `devnet` from actually serving mainnet. That
misconfiguration is invisible in selection state — the wallet cannot contradict
it and neither can the type system.

`assertSolanaClusterIdentity(key, expectedGenesisHash)` compares genesis hashes
over RPC. The expected hash is supplied by the application, because the package
holds no production constants; the application owns that data, like every other
registry value.

## Code and tests

Implementation:

- `packages/web3-solana/src/chain/selection/solana-selection.ts`
- `packages/web3-solana/src/chain/selection/use-solana-selection.ts`
- `packages/web3-solana/src/clients/create-solana-connection.ts`

Tests:

- `packages/web3-solana/src/chain/selection/solana-selection.test.ts`

Live verification: `pnpm solana:smoke` asserts the devnet genesis hash before
reading any balance.
