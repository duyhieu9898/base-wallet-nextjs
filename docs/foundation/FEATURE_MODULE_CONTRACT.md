# Feature Module Contract (`FEATURE_MODULE_CONTRACT.md`)

This document defines the specification and boundary rules for feature modules across applications in the NLN ecosystem.

---

## 1. Executive Summary & Goals

Feature modules encapsulate discrete business capabilities (e.g., Staking, Membership, Lending, MLM). To enable high maintainability and safe feature copying between applications, feature modules MUST follow a standardized anatomy and a formal **Host Capability Contract**.

---

## 2. Host Capability Contract

Feature modules do not exist in isolation; they run within host applications. To remain portable and decoupled from host application internals, a feature module MAY ONLY depend on the approved **5 Host Capabilities**:

| Host Capability             | Import Path                                                                                                                                | Purpose                                                                                       |
| :-------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------- |
| **EVM Foundation**          | `@nln/web3-evm` (or leaf paths `@nln/web3-evm/address`, `@nln/web3-evm/errors`, `@nln/web3-evm/errors/adapter`, `@nln/web3-evm/contracts`) | Network selection, wallet connection, EVM reads, writes, transaction history, error taxonomy. |
| **Contract Registry**       | `@/contracts/registry/contract-registry`                                                                                                   | Host deployment addresses and contract ABI resolution.                                        |
| **Shared UI Primitives**    | `@/components/ui/{button,input,...}`                                                                                                       | Design system UI primitives.                                                                  |
| **Transaction Feedback UI** | `@/components/web3/common/transaction-feedback`                                                                                            | Host transaction feedback modal, drawer, and status presentation.                             |
| **Translation Hook**        | `@/i18n/use-translation`                                                                                                                   | Public translation hook (`useTranslation`). Feature modules MUST NOT import `i18n-provider`.  |

### Feature Import Restrictions

Feature modules MUST NOT import:

- Host application pages or App Router layouts (`@/app/*`).
- Host root providers or composition wrappers (`@/providers/*`).
- Application bootstrap leaves of the Web3 package (`@nln/web3-evm/config` or `@nln/web3-evm/provider`).
- Other business feature modules (`feature A ↛ feature B`).
- Admin feature modules from product applications or vice versa.

---

## 3. Standard Feature Module Anatomy

Every feature module MUST follow this standard folder structure under `apps/<app>/src/features/<feature-name>/`:

```text
src/features/<feature-name>/
├── domain/            # Domain schemas, business types, feature-specific error helpers
├── components/        # Feature UI components & action panels
├── hooks/             # Feature business logic hooks (e.g., useStakingPosition, useStakingWrite)
├── contracts/         # Feature-specific contract ABIs & deployment selectors
├── history/           # Feature business activity storage & composition
├── mocks/             # MSW handlers & unit test mocks
└── index.ts           # Public barrel exporting ONLY approved public interfaces
```

### Public Barrel (`index.ts`) Invariant

The `index.ts` file acts as the public boundary of the feature module. Only symbols exported from `index.ts` are accessible to host application pages. Internal helpers, private hooks, or mock implementations MUST NOT be imported directly from deep subpaths outside the feature module.

---

## 4. Product vs. Admin Feature Module Isolation

Applications in the NLN ecosystem are categorized into **Product Applications** (`n-plus`, `neura`, `neura-link`) and **Admin Applications** (`n-plus-admin`, `neura-admin`, `neura-link-admin`).

- **Product Features** (e.g., `features/staking`, `features/membership`, `features/lending`):
  - Focus on end-user interactions: deposit, stake, claim, purchase membership, request loan.
  - Rely on Product SIWE Auth composed at the application level.
- **Admin Features** (e.g., `features/staking-management`, `features/membership-management`, `features/lending-management`):
  - Focus on admin operations: pool parameter configuration, treasury actions, reward rate updates, user management.
  - Rely on Admin RBAC Auth composed at the application level.

### Rule: Zero Cross-Import Between Product & Admin Features

Even when Product and Admin features relate to the same business domain (e.g. Staking), they MUST NOT import code from each other. They run in separate deployment units with different security boundaries and permission models. Shared artifacts MUST be limited to Solidity ABIs and deployment metadata.

---

## 5. Auth & RBAC Strategy

Authentication gating is composed by the host application (e.g., at page or layout composition level). A business feature module MUST NOT import `features/auth` or any other authentication feature directly.

- **Product SIWE Auth**: Handled by host application page wrappers via SIWE session tokens.
- **Admin RBAC Auth**: Handled by host admin application page wrappers via RBAC roles.

---

## 6. Feature Transaction Safety & Test Contract (8 Safety Groups)

Every feature hook executing EVM transactions (such as `useStakingWrite`) MUST implement and test the following 8 standard safety lifecycle groups:

1. **Preflight Readiness**: Verify network write readiness (`assertEvmWriteReady`) and verify allowance & approval state when the flow spends an ERC-20 token.
2. **Simulation Before Request**: Perform contract simulation (`useSimulateContract`) before opening any wallet signature prompt.
3. **Review Before Confirm**: Require explicit user review step before broadcasting transaction to wallet.
4. **Duplicate-Submit Guard**: Prevent duplicate wallet submissions via `useEvmWriteLifecycle`.
5. **Stale-Operation Isolation**: Isolate and reset stale operation state when connected account, chain, token, or spender changes.
6. **Terminal Receipt Evidence**: Treat transaction receipt as the sole terminal evidence for success/revert, never concluding success solely from transaction hash.
7. **Once-Per-Hash Side Effects**: Ensure history storage and domain callbacks execute exactly once per mined transaction hash.
8. **Targeted Cache Invalidation**: Run targeted QueryClient invalidation (`buildEvmWriteInvalidationFilters`) upon receipt confirmation without purging unrelated global caches.

---

## 7. Copy Checklist

The reason this contract exists is that a feature module must survive being
copied into another application. `features/staking` is the reference
implementation for that — a reference, not a shared SDK. Follow this in order.

### 7.1. Copy the shape, not the business logic

| Copy                                | Do not copy                                          |
| :---------------------------------- | :--------------------------------------------------- |
| Folder anatomy (§3)                 | Contract ABIs and prepared call data                 |
| Write lifecycle wiring (§6)         | Business rules — lock periods, tiers, health factors |
| Test contract — all 8 safety groups | Domain errors specific to the source feature         |
| Public barrel discipline            | Deployment addresses                                 |

Copying `use-staking-write.ts` wholesale carries staking's own assumptions into a
feature that does not share them. Take its structure and its tests; write the
builders, ABIs and domain errors for the new contract.

### 7.2. Before copying — check the target application

The module depends on 5 host capabilities (§2). A target application missing any
of them will fail to compile, and the person copying should not have to guess
which import is the problem:

```text
□ @nln/web3-evm            declared in the app's package.json
□ @/contracts/registry/contract-registry   exists, or is created with the feature
□ @/components/ui/{button,input}           design system primitives present
□ @/components/web3/common/transaction-feedback   host feedback surface present
□ @/i18n/use-translation                   translation hook present
```

Direct npm dependencies the reference module uses — the target app must declare
each one it actually imports, not rely on resolving them through a parent
directory (that is a phantom dependency, and it breaks when the app moves):

```text
react · wagmi · viem · @tanstack/react-query
```

### 7.3. After copying — rewire

```text
□ Add the contract to the app's src/contracts/registry/deployments.json,
  keyed by chain ID and contract key (0016)
□ Add the ABI under the feature's own contracts/ folder — a feature owns its ABI,
  the registry owns the deployment metadata
□ Rewrite the feature's deployment selector for the new contract key
□ Replace domain types, builders and errors — they are contract-specific
□ Keep the public barrel: export only what host pages need
```

Self-imports through `@/features/<name>/...` need no rewiring: `@/` resolves
inside each application, so they keep pointing at the copy.

### 7.4. Verify — the copy is not done until these pass

```text
□ pnpm --filter <app> typecheck
□ pnpm --filter <app> lint          ← proves the boundary rules, see below
□ pnpm --filter <app> test:run
□ pnpm --filter <app> build
```

Lint is doing real work here, not style checking. It is what catches the two
mistakes this contract exists to prevent: importing another feature, and
importing across applications. Both are errors, and both cover relative traversal
as well as the alias — `../../other-app/src/...` resolves for real in a workspace.

The 8 safety groups (§6) are not optional for a copied feature. A write flow that
skips simulation, review or receipt evidence is not a faster version of the
reference — it is a different and less safe transaction model, and `0011` and
`0015` forbid it regardless of which application it lives in.
