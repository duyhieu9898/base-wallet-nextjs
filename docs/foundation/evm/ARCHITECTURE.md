# EVM Runtime Architecture

This document describes the structure, ownership and boundaries of the EVM
chain-family runtime, `@nln/web3-evm`. It is one runtime, not the foundation.

Layer above it: [`../ARCHITECTURE.md`](../ARCHITECTURE.md) holds the rules that
apply to every chain family. Layer beside it: a second family gets its own
`docs/foundation/<family>/` subtree and never reuses this one's types.

Related EVM authority:

- [`EXTENSION_CONTRACT.md`](EXTENSION_CONTRACT.md) — EVM public API, two tiers, extension checklists.
- [`FEATURE_MODULE_CONTRACT.md`](FEATURE_MODULE_CONTRACT.md) — EVM feature write safety.
- [`ADOPTION_GUIDE.md`](ADOPTION_GUIDE.md) — adopting this runtime for a new EVM dApp.
- [`decisions/`](decisions/README.md) — EVM decisions `0001`–`0009`, `0011`, `0012`, `0015`, `0016`.

## 1. Design principles as applied to EVM

The family-neutral principles are in `../ARCHITECTURE.md` §2. Their EVM
expression:

### Registry-driven configuration

Supported EVM networks, RPC metadata, explorers, native currency and ERC-20
metadata come from the registry — never hardcoded in UI, hooks or feature code.

### Truthful state

Selection, transaction lifecycle and terminal receipt status represent actual
evidence, not inference.

### Pure logic separated from I/O

Adapters hold validation, builders, mappers and pure derivation. Services hold
external I/O. Hooks orchestrate React/Wagmi. Components render state and emit
user intent.

### Safety at domain boundaries

Read/write readiness, simulation, duplicate-submit protection, lifecycle,
receipt tracking and cache invalidation belong to domain hooks, not to form UI.

### Side-effect isolation

Storage, callbacks and cache side effects must never turn an already-broadcast
transaction into a submission failure.

### No fake fallback

Read failure, partial failure and unsupported selection are represented
explicitly; no fabricated balance, receipt or metadata.

### Runtime validation

JSON, environment variables, local storage and external RPC/library data are
untrusted at the boundary.

## 2. System context

```text
Application feature
        ↓
Application-owned Web3 presentation (0014)
        ↓
@nln/web3-evm — hooks, domain models, registry selectors
        ↓
EVM adapters and services
        ↓
Wagmi / Viem
        ↓
Wallet / RPC / EVM chain
```

The package never imports application features.

## 3. Module ownership

```text
packages/
└── web3-evm/             @nln/web3-evm
    ├── tsconfig.json
    ├── vitest.config.mts     independent package test configuration
    ├── test/
    │   └── setup.ts          pure package test setup
    └── src/
        ├── index.ts          public boundary (Tier A + Tier B)
        ├── address/          pure address primitives, public leaf (@nln/web3-evm/address)
        ├── errors/           error taxonomy and normalization, public leaf (@nln/web3-evm/errors)
        ├── config/           runtime configuration injection leaf (@nln/web3-evm/config)
        ├── provider/         EvmProvider and wagmi config adapter (@nln/web3-evm/provider)
        ├── testing/          live smoke verification (@nln/web3-evm/testing)
        ├── contracts/        generic contract deployment types and hydration helpers (0016)
        ├── chain/
        │   ├── registry/     network, token and native asset configuration
        │   └── selection/    wallet/network readiness
        ├── reads/
        │   ├── balances/
        │   └── allowances/
        ├── transactions/
        │   ├── lifecycle/         duplicate-submit, operation ownership
        │   ├── receipt/           receipt tracking
        │   ├── review/            shared review model
        │   ├── fees/              fee estimate
        │   ├── history/           versioned persistence, reconciliation
        │   ├── invalidation/      targeted cache invalidation
        │   ├── native-transfer/   prepare, review, hook, tests
        │   ├── erc20-transfer/    prepare, review, hook, tests
        │   └── erc20-approval/    prepare, review, hook, tests
        ├── abi/              standard ABI (ERC-20)
        └── clients/          Viem public client

apps/<app>/src/
├── providers/
│   └── web3-providers.tsx application provider composition root
└── components/web3/evm/    reusable presentation UI (0014)
```

A new chain family creates a sibling package next to this one — never a second
family inside `web3-evm/`. See [`../CHAIN_FAMILY_TEMPLATE.md`](../CHAIN_FAMILY_TEMPLATE.md).

Standard ABIs live in `abi/`, not in a slice and not in the application. `erc20`
has 17 consumers spread across `reads/` and all three transaction slices, so
assigning it to one slice would create cross-slice dependencies. It also does not
belong in `apps/<app>/src/contracts/registry`: that registry owns **feature
contract deployments**, while this is the interface of an ERC standard. A
specific feature contract's ABI still belongs to that feature (decision `0016`).

There is no `web3/core/`. Everything that once lived there — address utils,
registry types and selectors, `NATIVE_ASSET_ID` — has consumers only inside this
package, so by the rule in `../ARCHITECTURE.md` (no shared abstraction before two
real runtime consumers) it belongs to EVM. A shared package is re-established
only when two implemented families prove a common concept.

| Layer                             | Responsibility                                        |
| --------------------------------- | ----------------------------------------------------- |
| `src/index.ts`                    | Public boundary; every other path is internal         |
| `src/address/`                    | EVM address validation and presentation               |
| `src/errors/`                     | Typed error taxonomy and phase-aware normalization    |
| `src/chain/registry/`             | EVM network, token and native asset configuration     |
| `src/chain/selection/`            | EVM wallet/network readiness                          |
| `src/reads/`                      | Balance and allowance: hook, builder, mapper, service |
| `src/transactions/`               | Shared write mechanics + one vertical slice per tx    |
| `src/provider/`                   | `EvmProvider` and wagmi configuration                 |
| `apps/<app>/src/components/web3/` | Application-owned web3 presentation (`0014`)          |
| `apps/<app>/src/features/`        | Application business behavior                         |

## 4. Runtime module classification

### Core

These form the reusable EVM runtime boundary and cannot be dropped while an
application still uses this runtime:

- network/token registry;
- wallet/network selection;
- typed read boundaries;
- typed write readiness;
- error normalization;
- transaction lifecycle;
- cache ownership;
- provider composition.

### Optional

An application may keep, replace or drop these:

- local transaction history;
- fee preview UI;
- reusable transfer/approval forms;
- reusable transaction status components;
- i18n reference shell.

Dropping an optional module must not weaken core read/write safety.

### Reference and development-only

Not product requirements:

- `Web3Lab`;
- example networks and tokens;
- Sepolia local-write script;
- public RPC defaults.

Adoption must review, replace or delete reference defaults that do not fit.

## 5. Public API boundary

Allowed consumption:

- exported EVM hooks;
- exported EVM domain types;
- registry selectors;
- application-owned reusable Web3 components;
- documented application composition points.

An application must not depend on:

- internal refs of write hooks;
- private query-key implementation;
- low-level mutation calls used to bypass review;
- test helpers;
- internal adapter implementation serving a single hook;
- undocumented deep imports, which are private.

Public entrypoints are declared explicitly, never inferred from what an
application happens to import:

```text
@nln/web3-evm                runtime API (Tier A application, Tier B feature extension)
@nln/web3-evm/address        pure address primitives, React-free and wagmi-free
@nln/web3-evm/errors         pure error taxonomy, React-free and wagmi-free
@nln/web3-evm/errors/adapter Viem/Wagmi RPC error normalization adapter
@nln/web3-evm/contracts      generic contract deployment types and hydration helpers (0016)
@nln/web3-evm/registry       pure registry read selectors (explorer URL, network lookup)
@nln/web3-evm/config         runtime configuration injection leaf
@nln/web3-evm/provider       EvmProvider and wagmi config adapter
@nln/web3-evm/testing        live RPC smoke verification of this package
apps/<app>/src/providers/web3-providers.tsx  application composition root
```

Every other path under `packages/web3-evm/src/**` is private. ESLint enforces it.

`EvmProvider` sits at `@nln/web3-evm/provider`, deliberately not in the main
barrel. Presentation components belong to the application per decision `0014`.

The two tiers and the Tier B contract: [`EXTENSION_CONTRACT.md`](EXTENSION_CONTRACT.md) §2.

## 6. Adopting this runtime for an application

1. Choose supported EVM network entries.
2. Choose the default EVM chain ID from the registry.
3. Configure per-environment RPC overrides.
4. Review and replace sample token metadata.
5. Add feature-specific contracts in the application feature layer.
6. Choose which optional modules to keep.
7. Delete or hide unused reference/dev-only UI.
8. Run registry tests, live read smoke and application validation.

Moving from one EVM network to another normally changes only:

- network registry;
- token metadata;
- RPC environment configuration;
- network-specific smoke/write verification;
- feature contract deployments.

It must **not** require changing:

- wallet selection state model;
- typed error taxonomy;
- transaction lifecycle;
- receipt evidence rules;
- duplicate-submit protection;
- cache ownership.

If a network calls itself EVM but violates one of this runtime's assumptions,
that is an architecture change and must be handled as one — not hidden in
configuration.

Step-by-step adoption: [`ADOPTION_GUIDE.md`](ADOPTION_GUIDE.md).

## 7. Runtime flows

### Selection

```text
wallet connection
→ chain detection
→ disconnected | connecting | ready | unsupported
```

See `decisions/0006-wallet-selection-state.md`.

### Reads

```text
component
→ read hook
→ ready-selection gate
→ registry
→ Wagmi query or Viem service
→ pure mapper
→ UI model
```

See:

- `decisions/0001-network-and-token-registry.md`
- `decisions/0007-shared-read-logic.md`
- `decisions/0009-cache-ownership-and-invalidation.md`

### Writes

```text
user input
→ prepare
→ review
→ confirm
→ wallet request
→ hash
→ receipt tracking
→ cache/history side effects
```

See:

- `decisions/0005-write-readiness-and-submission-safety.md`
- `decisions/0008-write-hooks-and-transaction-lifecycle.md`
- `decisions/0011-transaction-review-and-fee-preview.md`

### Local history

Local transaction history is an optional persistence module and is not chain
source of truth. See `decisions/0012-local-transaction-history.md`.

## 8. EVM terminal evidence and trust boundary

The family-neutral rule is in `../ARCHITECTURE.md` §6: a submission identifier is
not terminal execution evidence, and every family runtime must define its own
terminal confirmation evidence. This is EVM's definition:

```text
transaction hash    proves only that the wallet/provider returned an identifier
receipt status      the single terminal evidence of success or revert
```

Concretely:

- A transaction hash never concludes success.
- Only a mined receipt concludes `success` or `reverted`.
- `SIMULATION_REVERTED` is never presented as a mined revert.
- Receipt-driven side effects run exactly once per hash.
- Local transaction history is not chain truth.

Additional EVM trust boundary items:

- The wallet is the signing authority; the package never stores, transmits or
  manages a private key.
- RPC and wallet-provider responses are external data.
- JSON registry, environment variables and local storage are runtime-validated.
- `NEXT_PUBLIC_*` variables must not contain secrets.
- UI must not bypass domain write guards.
- Application business policy may be stricter than this runtime, never weaker.

## 9. Testing

The four proof boundaries are family-neutral and defined in decision `0010`.
Their EVM instances:

- pure tests — registry validation, builders, mappers, error mapping, write status derivation;
- hook tests — mocked Wagmi with a real `QueryClient`;
- live read smoke — RPC reachability and registry/on-chain metadata agreement;
- local testnet writes — the Sepolia reference script.

```bash
pnpm web3:smoke
pnpm web3:smoke -- --chainId <chainId>
```

Network-specific smoke and write commands in this repository are reference
examples. An adopting application replaces or extends them for its own networks.

## 10. Change checklist

An EVM runtime change must preserve:

- registry-driven metadata;
- one authoritative selection state;
- read/write gating;
- pure logic separated from I/O;
- no UI write bypass;
- typed phase-aware errors;
- receipt-evidence terminal status;
- duplicate-submit and stale-operation safety;
- side-effect isolation;
- targeted cache invalidation;
- application/foundation dependency direction;
- abstraction only after real demand;
- tests at the correct proof boundary.
