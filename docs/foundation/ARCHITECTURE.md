# Web3 Foundation Architecture

This document holds what is true of **every** chain family. It is deliberately
short. If a rule here needs the words `receipt`, `chainId`, ERC-20, allowance,
spender, Wagmi or Viem to be stated, it is not a foundation rule — it belongs to
a family runtime document.

Three layers:

| Layer          | Document                                                                                          | Answers                                |
| -------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Foundation     | this file, `CAPABILITIES.md`, `EXTENSION_CONTRACT.md`, `FEATURE_MODULE_CONTRACT.md`, `decisions/` | What is true of every family           |
| Family runtime | [`evm/`](evm/ARCHITECTURE.md)                                                                     | How one runtime actually works         |
| Application    | [`../ARCHITECTURE.md`](../ARCHITECTURE.md)                                                        | Which application adopts which runtime |

Detailed invariants: `decisions/` (family-neutral) and `<family>/decisions/`.
Capability scope and runtime status: `CAPABILITIES.md`.
Use and extension rules: `EXTENSION_CONTRACT.md`.

## 1. Foundation identity

The foundation is reusable Web3 frontend infrastructure, independent of any
specific dApp's business logic.

The foundation does not decide on an application's behalf:

- which chain family is used;
- production network;
- default network;
- supported tokens;
- feature contracts;
- authentication;
- backend, indexer or analytics;
- product-specific UI and business rules.

The foundation organises blockchain support as independent chain-family modules.
Which of them are executable today is stated only in
[`CAPABILITIES.md`](CAPABILITIES.md) — no other document restates runtime status.

## 2. Design principles

### Registry-driven configuration

Network metadata, endpoints, explorers and asset metadata come from a validated
registry owned by the runtime, not from constants scattered through UI, hooks or
feature code.

### Truthful state

Selection state and transaction lifecycle represent actual evidence, never
inference.

### Pure logic separated from I/O

Pure validation, builders, mappers and derivation are separated from external
I/O, which is separated from React orchestration, which is separated from
rendering.

### Safety at domain boundaries

Readiness checks, preflight, duplicate-submit protection, lifecycle,
confirmation tracking and cache invalidation belong to domain hooks, never to
form UI.

### Side-effect isolation

Storage, callbacks and cache side effects must never turn an already-submitted
transaction into a submission failure.

### No fake fallback

Failure, partial failure and unsupported selection are represented explicitly.
No fabricated balance, confirmation or metadata.

### Runtime validation

JSON, environment variables, local storage and external RPC/library data are
untrusted at the boundary.

### Abstraction after evidence

No shared abstraction before a real consumer and a real invariant exist.

## 3. Family package isolation

Each chain family is a sibling workspace package. One family per package.

```text
packages/
├── web3-evm/          @nln/web3-evm
└── web3-<family>/     a second family, when an approved requirement exists
```

Rules:

- A family owns its own account/address types, wallet integration, network
  registry, provider/client, asset model, reads and writes, error normalization,
  transaction lifecycle, confirmation evidence, cache ownership and tests.
- Sibling family packages never import each other.
- One family's types are never reused by another — not addresses, not transaction
  references, not wallet-selection state, not token models.
- No universal `sendTransaction` or equivalent cross-family transaction
  interface.
- No shared package (`web3-core`, `web3-universal`, or similar) before **two
  implemented** runtimes prove that an invariant and its semantics are identical.
  A shape that merely looks alike is not evidence.

The requirement record, ownership list and definition of done for a new family
are in [`CHAIN_FAMILY_TEMPLATE.md`](CHAIN_FAMILY_TEMPLATE.md). That template is
documentation, not a runtime. A family is added only when an application
requirement has been approved and recorded.

## 4. Foundation and application ownership

```text
Foundation package    hooks · domain state · types · pure models · state derivation
Application           presentation · routing · auth · business rules · deployments
```

A foundation package exports no presentation rendered with a design system
(decision `0014`). The application composes providers, chooses which runtime is
mounted, and owns everything a design system touches.

## 5. Dependency direction

```text
Application feature
      ↓ uses
Family runtime public API
      ↓
Underlying libraries and SDKs
```

Invalid:

```text
Family runtime  ──►  application feature
```

The foundation must not know about staking, payments, vaults, membership, MLM or
any application-specific route.

## 6. Trust and security principles

These hold regardless of family:

- The foundation never stores, transmits or manages a private key.
- The wallet is the signing authority.
- RPC and wallet-provider responses are external, untrusted data.
- Registry JSON, environment variables and local storage are runtime-validated.
- Public environment variables must not contain secrets.
- **A submission identifier is not terminal execution evidence.** Receiving an
  identifier back from a wallet or provider proves only that the request was
  accepted. Each family runtime must define its own terminal confirmation
  evidence and must never conclude success without it.
- Local transaction history is never chain truth.
- UI must not bypass domain write guards.
- Application business policy may be stricter than the foundation, never weaker.

Each family states its own terminal evidence in its runtime document — EVM's is
in [`evm/ARCHITECTURE.md`](evm/ARCHITECTURE.md) §8.

## 7. Testing shape

Four proof boundaries, each responsible for one class of risk. No layer proves
another layer's behavior:

```text
pure function tests
hook tests
live read smoke
local testnet writes
```

Decision `0010` owns this. Each family supplies its own instances, scripts and
test networks.

Repository baseline:

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test:run
pnpm build
```

Never claim a command passed without running it.

## 8. Change checklist

A foundation change must preserve:

- family package isolation;
- foundation/application ownership split;
- dependency direction;
- one authoritative selection state per runtime;
- readiness gating and no UI write bypass;
- typed, phase-aware errors;
- terminal-evidence discipline;
- duplicate-submit and stale-operation safety;
- side-effect isolation;
- targeted cache invalidation;
- abstraction only after real demand;
- tests at the correct proof boundary.

## 9. Related authority

- [`CAPABILITIES.md`](CAPABILITIES.md) — capability scope and runtime status.
- [`EXTENSION_CONTRACT.md`](EXTENSION_CONTRACT.md) — how applications use and extend the foundation.
- [`FEATURE_MODULE_CONTRACT.md`](FEATURE_MODULE_CONTRACT.md) — feature module boundaries.
- [`CHAIN_FAMILY_TEMPLATE.md`](CHAIN_FAMILY_TEMPLATE.md) — adding a family runtime.
- [`decisions/README.md`](decisions/README.md) — family-neutral decisions.
- [`evm/ARCHITECTURE.md`](evm/ARCHITECTURE.md) — the EVM runtime.
- [`../ARCHITECTURE.md`](../ARCHITECTURE.md) — application architecture.
