# EVM Feature Module Contract

This document states how a feature module in an **EVM** application satisfies the
family-neutral obligations in
[`../FEATURE_MODULE_CONTRACT.md`](../FEATURE_MODULE_CONTRACT.md).

Read that document first. It owns anatomy, the public barrel invariant, host
capabilities, product/admin isolation and the copy checklist. This one owns only
the EVM mechanisms.

## 1. Host runtime

The chain-family host capability resolves to `@nln/web3-evm`:

```text
@nln/web3-evm                network selection, wallet connection, reads, writes,
                             transaction history, error taxonomy
@nln/web3-evm/address        pure address primitives
@nln/web3-evm/errors         pure error taxonomy
@nln/web3-evm/errors/adapter Viem/Wagmi RPC error normalization
@nln/web3-evm/contracts      generic contract deployment types (0016)
```

Feature modules must not import `@nln/web3-evm/config` or
`@nln/web3-evm/provider` — those are application bootstrap leaves, and provider
composition belongs to the host.

Direct npm dependencies an EVM feature module actually imports must be declared
by the app itself:

```text
react · wagmi · viem · @tanstack/react-query
```

## 2. The eight safety obligations in EVM terms

Every feature hook that executes an EVM transaction — `useStakingWrite` and its
equivalents — must implement and test all eight. The numbering matches
`../FEATURE_MODULE_CONTRACT.md` §5.

| #   | Obligation                  | EVM mechanism                                                                                      |
| --- | --------------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | Preflight readiness         | `assertEvmWriteReady`; plus ERC-20 allowance and approval state when the flow spends a token       |
| 2   | Preflight simulation        | `useSimulateContract` with the connected account, before any wallet signature prompt               |
| 3   | Review before confirm       | Explicit `Prepare → Review → Confirm`; see `0011`                                                  |
| 4   | Duplicate-submit guard      | `useEvmWriteLifecycle`, including the synchronous submitted-hash guard                             |
| 5   | Stale-operation isolation   | Reset on change of connected account, chain, token or spender                                      |
| 6   | Terminal evidence only      | Mined **receipt** status is the sole terminal evidence. A transaction hash never concludes success |
| 7   | Once-per-submission effects | History storage and domain callbacks run exactly once per mined transaction hash                   |
| 8   | Targeted cache invalidation | `buildEvmWriteInvalidationFilters` on receipt confirmation; no global cache purge                  |

Obligations 3, 4, 5 and 7 are family-neutral in meaning — the EVM entries above
are how they are implemented here, not what makes them required.

## 3. EVM error semantics for features

A feature may add feature-specific error codes. It must not:

- change the meaning of runtime error codes;
- present `SIMULATION_REVERTED` as a mined revert;
- infer `success` or `reverted` before a receipt exists;
- display raw Viem/Wagmi messages or RPC payloads.

Feature errors may wrap `EvmWeb3Error` and preserve the original `cause`.

## 4. Authority

A write flow that skips simulation, review or receipt evidence is forbidden by
`0011` and `0015` regardless of which application it lives in. Tier B of
`@nln/web3-evm` is public but conditional — the conditions are in
[`EXTENSION_CONTRACT.md`](EXTENSION_CONTRACT.md) §2, and they are the same eight
obligations restated at the package boundary.
