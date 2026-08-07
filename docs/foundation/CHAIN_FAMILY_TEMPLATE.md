# Chain-family runtime template

This document is a checklist, not an implementation, a provider, or a claim that
a second chain family is supported.

Use this template only when an application has an approved requirement for a
chain family that EVM cannot serve. Do not add a family because it might be
useful later.

## Required implementation boundary

Create a sibling workspace package, `packages/web3-<family>/`, next to
`packages/web3-evm/`. Do not add a second family inside the EVM package. The
family owns its own:

- account and address types;
- network and asset registry;
- wallet integration and provider;
- public client/read services;
- signing and write lifecycle;
- transaction references and confirmation evidence;
- error taxonomy and normalization;
- cache ownership and invalidation;
- tests and live verification.

Do not import EVM address, transaction, wallet-selection, or token types into
the new family. Do not introduce a universal `sendTransaction` interface unless
two implemented families prove that an invariant and semantics are identical.

## Before writing code

Record the application requirement and decide:

1. supported networks and wallet connectors;
2. account/identity model and whether authentication must support the family;
3. read, write, simulation/preflight, and confirmation semantics;
4. RPC provider, rate-limit, and failure policy;
5. asset metadata source and validation;
6. feature contract/program ownership and deployment verification;
7. test network, live-read smoke, and safe write verification.

## Definition of done

The family becomes an executable runtime only when it has a provider,
selection state, at least one real read and write flow, receipt/confirmation
evidence, typed errors, focused tests, and application adoption documentation.
Until then, keep this template unchanged and do not add SDK dependencies or
metadata catalogs.
