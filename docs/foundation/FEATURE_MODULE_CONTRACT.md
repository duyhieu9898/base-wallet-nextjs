# Feature Module Contract

This document defines the boundary rules for feature modules in every NLN
application, on every chain family.

It is family-neutral by construction. A rule that can only be stated with the
words `receipt`, `chainId`, ERC-20, allowance, spender, Wagmi or Viem is not in
this document — it belongs to the runtime that owns those concepts:

- EVM: [`evm/FEATURE_MODULE_CONTRACT.md`](evm/FEATURE_MODULE_CONTRACT.md)

A feature module must satisfy **this** contract plus the contract of the runtime
its application adopted. Which application adopts which runtime:
[`../ARCHITECTURE.md`](../ARCHITECTURE.md) §2.

---

## 1. Purpose

Feature modules encapsulate discrete business capabilities — staking, membership,
MLM rank and reward, treasury operations. To stay maintainable and to survive
being copied into another application, they follow a standard anatomy and a
formal host capability contract.

---

## 2. Host Capability Contract

A feature module runs inside a host application. To stay portable and decoupled
from host internals, it may depend only on the five approved host capabilities:

| Host Capability             | Purpose                                                                                                                                             |
| :-------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Chain-family runtime**    | The `@nln/web3-<family>` package the application adopted: network selection, wallet connection, reads, writes, transaction history, error taxonomy. |
| **Contract Registry**       | `@/contracts/registry/contract-registry` — host deployment addresses and contract/program resolution.                                               |
| **Shared UI Primitives**    | `@/components/ui/{button,input,...}` — design system primitives.                                                                                    |
| **Transaction Feedback UI** | `@/components/web3/common/transaction-feedback` — host transaction feedback surface.                                                                |
| **Translation Hook**        | `@/i18n/use-translation` — public translation hook. Feature modules must not import `i18n-provider`.                                                |

Exactly one chain-family runtime appears in this list for a given application,
and it is the one that application adopted. A feature in an EVM application
depends on `@nln/web3-evm`; a feature in a Solana application depends on
`@nln/web3-solana`. A feature never depends on a runtime its host did not adopt,
and never on two.

### Import restrictions

Feature modules must not import:

- Host application pages or App Router layouts (`@/app/*`).
- Host root providers or composition wrappers (`@/providers/*`).
- Application bootstrap leaves of a runtime package (its `config` or `provider`
  entrypoints). Provider composition is the host's job.
- Other business feature modules (`feature A ↛ feature B`).
- Admin feature modules from product applications, or the reverse.

---

## 3. Standard Feature Module Anatomy

Every feature module follows this structure under
`apps/<app>/src/features/<feature-name>/`:

```text
src/features/<feature-name>/
├── domain/            # Domain schemas, business types, feature-specific error helpers
├── components/        # Feature UI components & action panels
├── hooks/             # Feature business logic hooks
├── contracts/         # Feature-specific contract/program interfaces & deployment selectors
├── history/           # Feature business activity storage & composition
├── mocks/             # MSW handlers & unit test mocks
└── index.ts           # Public barrel exporting ONLY approved public interfaces
```

### Public barrel invariant

`index.ts` is the public boundary of the feature module. Only symbols exported
from it are reachable by host application pages. Internal helpers, private hooks
and mock implementations must not be imported from deep subpaths outside the
module.

---

## 4. Product and Admin isolation

Applications are either **product** (`n-plus`, `neura`, `neura-link`) or
**admin** (`n-plus-admin`, `neura-admin`, `neura-link-admin`).

- **Product features** focus on end-user interaction — stake, claim, purchase,
  withdraw — and rely on product authentication composed at the application
  level.
- **Admin features** focus on operator actions — pool parameters, treasury
  actions, reward configuration, user management — and rely on admin RBAC
  composed at the application level.

### Rule: zero cross-import between product and admin

Even for the same business domain, product and admin features must not import
from each other. They are separate deployment units with different security
boundaries and permission models. Shared artefacts are limited to contract
ABIs/IDLs and deployment metadata.

---

## 5. Feature transaction safety obligations

These obligations hold for **every** feature that submits a transaction, on any
chain family. They are stated as obligations, not as mechanisms; the runtime
supplies the mechanism, and the runtime's own feature contract names it.

1. **Preflight readiness.** Verify the runtime reports write readiness before
   building a transaction, and verify any authorization state the flow depends
   on.
2. **Preflight simulation.** Simulate or dry-run against the connected account
   before opening a wallet signature prompt. Never open a wallet prompt for a
   transaction that has not been checked.
3. **Review before confirm.** Require an explicit user review step before
   broadcasting. A feature never collapses prepare and submit into one action.
4. **Duplicate-submit guard.** A single user intent produces at most one
   submission. Guarding must not depend on React render timing.
5. **Stale-operation isolation.** When the connected account, network, or any
   input the submission was built from changes, the in-flight operation is
   isolated and reset. A result must never be attributed to the wrong context.
6. **Terminal evidence only.** A feature concludes success or failure only from
   the terminal confirmation evidence its runtime defines. A submission
   identifier returned by a wallet or provider is not that evidence.
7. **Once-per-submission side effects.** History writes and domain callbacks run
   exactly once per confirmed submission, keyed by that submission's terminal
   reference.
8. **Targeted cache invalidation.** On confirmation, invalidate only the queries
   the transaction affected. Never purge unrelated global cache.

Obligations 3, 4, 5 and 7 are behavioural and identical across families.
Obligations 1, 2, 6 and 8 are behavioural too, but their evidence and API differ
per family — the runtime's feature contract states which call satisfies each.

Skipping any of these is not a faster feature. It is a different and less safe
transaction model.

---

## 6. Copy Checklist

This contract exists because a feature module must survive being copied into
another application. Copy within the same chain family; a feature does not port
across families, because its contract interactions do not.

### 6.1. Copy the shape, not the business logic

| Copy                              | Do not copy                                           |
| :-------------------------------- | :---------------------------------------------------- |
| Folder anatomy (§3)               | Contract ABIs/IDLs and prepared call data             |
| Write lifecycle wiring (§5)       | Business rules — lock periods, tiers, rank thresholds |
| Test contract — all 8 obligations | Domain errors specific to the source feature          |
| Public barrel discipline          | Deployment addresses                                  |

Copying a write hook wholesale carries the source feature's assumptions into a
feature that does not share them. Take its structure and its tests; write the
builders, interfaces and domain errors for the new contract.

### 6.2. Before copying — check the target application

The module depends on the five host capabilities (§2). A target application
missing any of them fails to compile, and the person copying should not have to
guess which import is the problem:

```text
□ the adopted @nln/web3-<family> package   declared in the app's package.json
□ @/contracts/registry/contract-registry   exists, or is created with the feature
□ @/components/ui/{button,input}           design system primitives present
□ @/components/web3/common/transaction-feedback   host feedback surface present
□ @/i18n/use-translation                   translation hook present
```

Direct npm dependencies must each be declared by the target app, not resolved
through a parent directory — that is a phantom dependency and it breaks when the
app moves. Which dependencies those are is family-specific; the runtime's
feature contract lists them.

### 6.3. After copying — rewire

```text
□ Add the contract to the app's contract deployment registry, keyed by
  network and contract key (0016)
□ Add the interface (ABI/IDL) under the feature's own contracts/ folder — a
  feature owns its interface, the registry owns the deployment metadata
□ Rewrite the feature's deployment selector for the new contract key
□ Replace domain types, builders and errors — they are contract-specific
□ Keep the public barrel: export only what host pages need
```

Self-imports through `@/features/<name>/...` need no rewiring: `@/` resolves
inside each application, so they keep pointing at the copy.

### 6.4. Verify — the copy is not done until these pass

```text
□ pnpm --filter <app> typecheck
□ pnpm --filter <app> lint          ← proves the boundary rules, see below
□ pnpm --filter <app> test:run
□ pnpm --filter <app> build
```

Lint is doing real work here, not style checking. It catches the two mistakes
this contract exists to prevent: importing another feature, and importing across
applications. Both are errors, and both cover relative traversal as well as the
alias — `../../other-app/src/...` resolves for real in a workspace.
