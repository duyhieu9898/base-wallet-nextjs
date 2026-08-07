# Application Architecture

This document owns the **application layer** of the repository: which
applications exist, which chain-family runtime each one adopts, and how
dependencies are allowed to point.

It does not define foundation policy. Foundation authority lives in
[`foundation/`](foundation/README.md); the family-neutral rules are in
[`foundation/ARCHITECTURE.md`](foundation/ARCHITECTURE.md) and the EVM runtime is
described in [`foundation/evm/ARCHITECTURE.md`](foundation/evm/ARCHITECTURE.md).

Three layers, kept separate on purpose:

```text
foundation/ARCHITECTURE.md       what is true of every chain family
foundation/<family>/             how one runtime actually works
ARCHITECTURE.md   (this file)    which application adopts which runtime
```

Foundation never names an application. This file never states a rule that a
runtime must obey.

## 1. Monorepo shape

One pnpm workspace, `nln-platform`. Not one repository per product.

```text
packages/
└── web3-evm/            @nln/web3-evm — the only executable runtime today

apps/
├── n-plus/              product
└── n-plus-admin/        admin
```

Planned, not yet scaffolded — listed so the dependency rules below are read as
the target, not as a description of today:

```text
packages/web3-solana/    @nln/web3-solana
apps/neura/              apps/neura-admin/
apps/neura-link/         apps/neura-link-admin/
```

Runtime support status is owned by
[`foundation/CAPABILITIES.md`](foundation/CAPABILITIES.md). Build sequence is
owned by
[`plans/active/foundation-multi-app-execution.md`](plans/active/foundation-multi-app-execution.md).

## 2. Application ↔ runtime adoption

Choosing a runtime is an application decision
(`foundation/EXTENSION_CONTRACT.md` §1.1). This table is where that choice is
recorded for this repository.

| Application        | Kind    | Runtime adopted    | Status      |
| ------------------ | ------- | ------------------ | ----------- |
| `n-plus`           | product | `@nln/web3-evm`    | Implemented |
| `n-plus-admin`     | admin   | `@nln/web3-evm`    | Implemented |
| `neura`            | product | `@nln/web3-solana` | Planned     |
| `neura-admin`      | admin   | `@nln/web3-solana` | Planned     |
| `neura-link`       | product | `@nln/web3-evm`    | Planned     |
| `neura-link-admin` | admin   | `@nln/web3-evm`    | Planned     |

Per-application adoption detail — networks, default network, adopted
capabilities, restrictions, deviations — lives in each application's own record:

```text
product/n-plus/foundation-adoption.md
product/neura/foundation-adoption.md        written when the app is scaffolded
product/neura-link/foundation-adoption.md   written when the app is scaffolded
```

An application adopts a runtime. It does not modify one. Enabling or disabling a
family in one application is never a reason to change a foundation decision
(`foundation/EXTENSION_CONTRACT.md` §13).

### Adoption depth differs between product and admin

Adopting a runtime does not mean mounting all of it. `n-plus-admin` depends on
`@nln/web3-evm` but declares neither `wagmi` nor `@tanstack/react-query`: it
consumes only the React-free leaves (`/address`, `/registry`, `/config`) to
render explorer links, and never connects a wallet. That is the intended shape —
the pure leaves exist precisely so a read-only surface is not forced to pull the
whole runtime into its module graph (`foundation/evm/EXTENSION_CONTRACT.md` §1).

## 3. Dependency direction

```text
apps/*  ──uses──►  packages/*  ──uses──►  wagmi · viem · query · (per-family SDKs)
```

Invalid, all of them enforced by ESLint including relative traversal
(`../../other-app/src/...` resolves for real in a workspace):

```text
packages/*      ──►  apps/*            a package never knows an application
app A           ──►  app B             including product ──► admin and back
feature A       ──►  feature B         within the same application
packages/web3-evm ──► packages/web3-solana   siblings never import each other
```

Chain-family packages are siblings. There is no `packages/web3-core`,
`web3-universal` or `multi-chain`, and none is planned. A shared package is
created only after two implemented runtimes prove an identical invariant and
identical semantics — `foundation/ARCHITECTURE.md` §Chain-family extension seam
and `foundation/package-scope-evidence.md` hold that rule and the current
verdicts.

## 4. Product and admin are separate deployment units

Each product system has its own admin application. They are not two routes of
one application:

- different authentication models — product SIWE session versus admin RBAC;
- different design systems — `n-plus` renders with `@base-ui/react`,
  `n-plus-admin` with Radix. This is the measured reason decision `0014` puts
  presentation in the application rather than the foundation package;
- different deployment and blast radius.

Shared artefacts between a product app and its admin app are limited to contract
ABIs and deployment metadata. Code is not shared between them
(`foundation/FEATURE_MODULE_CONTRACT.md` §4).

## 5. Inside an application

```text
apps/<app>/src/
├── routes/               TanStack Router file routes (generates routeTree.gen.ts)
├── pages/                page components the routes mount
├── main.tsx              entry point — creates the router and mounts React
├── providers/            composition root — chooses which runtime is mounted
├── components/ui/        design system primitives
├── components/web3/      application-owned web3 presentation (0014)
├── config/               runtime configuration supplied to the family package
├── contracts/registry/   this application's contract deployments (0016)
└── features/<feature>/   business capability, per FEATURE_MODULE_CONTRACT.md
```

`providers/` is the only place that decides which family runtime is mounted. A
feature never mounts a provider, and never imports a package's bootstrap leaves.

Feature module anatomy, host capability contract, and the copy checklist are
owned by
[`foundation/FEATURE_MODULE_CONTRACT.md`](foundation/FEATURE_MODULE_CONTRACT.md).

## 6. Cross-family applications

No application adopts two chain families. `neura` is Solana; `n-plus` and
`neura-link` are EVM. A single application mounting two runtimes at once needs
its own decision covering provider composition, cache ownership across families
and cross-family transaction UX — see `foundation/CAPABILITIES.md`,
"Multi-family simultaneous application". Do not build toward it speculatively.

## 7. Related authority

- [`foundation/ARCHITECTURE.md`](foundation/ARCHITECTURE.md) — family-neutral foundation architecture.
- [`foundation/evm/ARCHITECTURE.md`](foundation/evm/ARCHITECTURE.md) — EVM runtime internals.
- [`foundation/CAPABILITIES.md`](foundation/CAPABILITIES.md) — runtime status, single source of truth.
- [`decisions/`](decisions/README.md) — application decisions.
- [`product/nln-feature-source-map.md`](product/nln-feature-source-map.md) — product scope intake.
