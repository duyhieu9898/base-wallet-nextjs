# Execution Plan: Documentation layer separation before `@nln/web3-solana`

Date: 2026-08-07

## Status

Completed

## Outcome

Documentation separates three layers that are currently mixed, so that adding a
second chain-family runtime requires **adding** documents, not **rewriting** EVM
documents to accommodate Solana:

```text
Foundation (family-neutral)   docs/foundation/
EVM runtime                   docs/foundation/evm/
Which app adopts which runtime  docs/ARCHITECTURE.md
```

Observable result: no family-neutral authority document names `receipt`,
`chainId`, ERC-20, allowance, spender, Wagmi or Viem as a required mechanism, and
a Solana feature module can satisfy `FEATURE_MODULE_CONTRACT.md` without
implementing EVM primitives.

## Context

- Baseline: `main` @ `38fc04d` — the SSOT commit that removed the "Solana already
  exists" claims but left the foundation/EVM/application layers mixed.
- Authority: `docs/foundation/EXTENSION_CONTRACT.md` §10 (foundation change
  rules), `docs/foundation/CHAIN_FAMILY_TEMPLATE.md` (sibling-package rule and
  the pre-code requirement record).
- Product scope: `docs/product/nln-feature-source-map.md` (N+ has **no** Lending;
  N+ staking is Flexible USDT Staking).

## Scope

In scope:

- Split family-neutral foundation authority from EVM runtime authority.
- Turn `docs/ARCHITECTURE.md` from a stub into real application architecture.
- Re-scope existing decisions as EVM rather than universal.
- `CAPABILITIES.md` status model and the presentation-ownership contradiction.
- Per-application foundation adoption records.
- Stale N+ Lending / `NRA ⇄ USDT` references.
- The Solana requirement record demanded by `CHAIN_FAMILY_TEMPLATE.md`.

Out of scope:

- Any change to `packages/web3-evm/` source. EVM types keep EVM names and EVM
  ownership; a second family is not a reason to genericise the first.
- Creating `packages/web3-core`, `web3-universal`, or any cross-family
  abstraction.
- Writing Solana implementation detail. Only the requirement record is produced.
- Creating `docs/product/neura/foundation-adoption.md` with invented values; it
  is written when the Neura app is scaffolded.

## Approach

Ordered because later steps depend on paths established by earlier ones.

1. `AGENTS.md` — correct the stale package location, the Lending claim, and the
   three broken `nln-frontend` links. It is the highest-authority file and is
   loaded into every session, so it is fixed first.
2. `docs/ARCHITECTURE.md` — application/monorepo architecture: app ↔ runtime
   mapping, dependency direction, product/admin split.
3. Create `docs/foundation/evm/` and move EVM mechanics out of the neutral
   documents (`ARCHITECTURE.md`, `EXTENSION_CONTRACT.md`, `ADOPTION_GUIDE.md`,
   `README.md`).
4. Split `FEATURE_MODULE_CONTRACT.md`. The neutral contract keeps the four
   safety obligations that are family-neutral in meaning (review before confirm,
   duplicate-submit guard, stale-operation isolation, once-per-terminal-reference
   side effects); the EVM contract owns the mechanisms that implement them.
5. Sweep the "submission identifier ≠ terminal evidence" restatement across every
   location that currently hardcodes `receipt` as the universal rule.
6. Move EVM decisions to `docs/foundation/evm/decisions/`; keep neutral ones in
   `docs/foundation/decisions/`; move `0013` to application decisions.
7. `CAPABILITIES.md` — `Planned → In Progress → Ready` status model; demote the
   "Ready application shell" section that contradicts `0014`.
8. Per-app foundation adoption records under `docs/product/<app>/`.
9. Clean stale Lending / `NRA ⇄ USDT` references.
10. Record the Solana application requirement per `CHAIN_FAMILY_TEMPLATE.md`
    §"Before writing code". Until this exists, `packages/web3-solana` is not
    authorised to start.

## Risks And Recovery

- **Risk: the neutral/EVM split silently weakens transaction safety.** Moving all
  eight safety groups of `FEATURE_MODULE_CONTRACT.md` §6 into EVM documentation
  would leave a Solana feature with no review, duplicate-guard, stale-isolation
  or once-per-terminal obligation. Mitigation: step 4 splits obligation from
  mechanism instead of moving the section wholesale.
- **Risk: the receipt restatement creates new drift.** The rule appears in six
  independent places. Mitigation: step 5 is a single sweep with an explicit
  location list, not an edit to one file.
- **Risk: moving decision files breaks references.** Measured before starting —
  14 path-style references, all other references are bare IDs that survive a
  move. Decision IDs are **not** renumbered.
- Recovery: the work is documentation-only and confined to `docs/` plus
  `AGENTS.md`. `git checkout -- docs AGENTS.md` restores the baseline; no code,
  build, or runtime artefact depends on these paths except the comment reference
  in `packages/web3-evm/src/index.ts`.

## Progress

- [x] 1. `AGENTS.md` corrected — package path, Lending claim, three broken links.
- [x] 2. `docs/ARCHITECTURE.md` application architecture.
- [x] 3. `docs/foundation/evm/` created; neutral documents de-EVM-ed.
- [x] 4. `FEATURE_MODULE_CONTRACT.md` split, obligation/mechanism preserved.
- [x] 5. Terminal-evidence sweep across all six locations.
- [x] 6. Decisions re-scoped; `0013` moved to application decisions.
- [x] 7. `CAPABILITIES.md` status model and shell demotion.
- [x] 8. Per-app adoption records for `n-plus` and `n-plus-admin`.
- [x] 9. Stale product references cleaned.
- [x] 10. Solana requirement record written; Solana moved to `Planned`.

## Decisions

- 2026-08-07: Decisions move into a per-family directory rather than gaining a
  scope column. Measured cost is 14 path references; bare-ID references are
  unaffected. Doing it now means it happens once, before Solana adds its own.
- 2026-08-07: Decision IDs stay globally unique across the foundation and are not
  renumbered on move. The directory carries the scope; the ID carries identity.
  Renumbering would break dozens of bare-ID references for no benefit.
- 2026-08-07: `0010` (testing strategy), `0014` (component organization) and
  `0017` (error normalization and observability) stay family-neutral. Their rules
  are stated as shapes — four proof layers, design-system dependency as the
  boundary, one domain error type per boundary — and each admits a Solana
  instance without change.
- 2026-08-07: `0013` (i18n and hydration) moves to `docs/decisions/`. It governs
  `I18nProvider` in the application shell and no foundation package.

## Validation

- Focused proof: no family-neutral document under `docs/foundation/` (excluding
  `evm/`) matches `receipt|chainId|ERC-20|allowance|spender|Wagmi|Viem` as a
  required mechanism.
- Integration proof: every markdown link in the changed documents resolves to an
  existing file.
- Repository-required checks: `pnpm format:check`. Documentation-only change —
  typecheck, lint, test and build are unaffected but are run to confirm that.

## Result

Complete and validated.

Delivered:

- Three layers separated. `docs/ARCHITECTURE.md` is real application
  architecture; `docs/foundation/` is family-neutral; `docs/foundation/evm/`
  owns the EVM runtime (architecture, extension contract, feature contract,
  adoption guide, 13 decisions).
- `FEATURE_MODULE_CONTRACT.md` is now satisfiable by a non-EVM feature. Its eight
  safety obligations survived the split as obligations; the EVM mechanisms that
  implement them moved to `evm/FEATURE_MODULE_CONTRACT.md`. Nothing was dropped.
- Decision scope: `0010`, `0014`, `0017` stayed family-neutral, 13 moved to
  `evm/decisions/`, `0013` moved to `docs/decisions/`. No ID renumbered.
- `CAPABILITIES.md` gained `Planned` and `In Progress` with explicit transition
  conditions; Solana is `Planned`; the "Ready application shell" section is
  demoted to reference material, resolving its contradiction with `0014`.
- `solana-runtime-requirement.md` records the approved Neura requirement and the
  seven pre-code decisions. Item 3 — Solana's terminal confirmation evidence — is
  marked OPEN and blocking; it must be closed before `packages/web3-solana/` is
  created.

Validation:

- `pnpm format:check` — passes.
- Link check across all changed documents — 0 broken relative links.
- Leak check — no family-neutral document states an EVM mechanism as a required
  mechanism; remaining matches are the meta-rule itself and clearly labelled EVM
  instances.
- `pnpm test:run` — passes (280 tests, both apps).
- `pnpm lint` — 0 errors, 5 pre-existing warnings.
- `pnpm typecheck` and `pnpm build` — **fail**, in
  `apps/n-plus/src/features/auth/runtime/auth-runtime-provider.tsx:211`. Verified
  pre-existing by stashing this change and re-running on clean `38fc04d`; it fails
  identically. Not caused by and not addressed by this work.

Follow-up, not in this plan:

- Fix the pre-existing `auth-runtime-provider.tsx` type error.
- Close OPEN item 3 of the Solana requirement record before creating the package.
- Write `docs/product/neura/foundation-adoption.md` when the app is scaffolded.
