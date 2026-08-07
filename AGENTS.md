<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Current State & Ecosystem Vision

- **Present Stage**: Hardening the single EVM foundation, `@nln/web3-evm` (network/token registry, SIWE auth, Wagmi/Viem providers, read/write hooks, transaction lifecycle). It currently lives at `src/web3/evm/` and is not yet a workspace package.
- **Target**: One pnpm workspace monorepo, shared packages (`@nln/web3-evm`, `@nln/web3-solana`) serving **6 applications** (3 product + 3 admin). Not separate repositories — see the execution plan §1.
  1. **N+ System** — in progress, `apps/n-plus` & `apps/n-plus-admin`: USDT ⇄ USDT Lending, NRA ⇄ USDT Staking, Unilevel MLM (Personal & Team Ranks).
  2. **Neura System** — in progress in parallel, `apps/neura` & `apps/neura-admin`: Solana NRA ⇄ NRA Staking Platform (Multi-Pools, Fixed/Flexible Terms, Claim/Compound, Reservation).
  3. **Neura Link System** — after N+ & Neura, `apps/neura-link` & `apps/neura-link-admin`: 5 NFT Membership Tiers, NRA ⇄ USDT Staking, Full 5-Rank / 5-Reward Unilevel MLM.
- **No other `@nln/*` package is approved.** `transaction-planner`, `rpc-observability`, `mlm-sdk`, `staking-sdk` and `ui-components` are DEFER/REJECT candidates. Before proposing one, answer: **has a second consumer been implemented?** Evidence and verdicts: [package-scope-evidence.md](file:///home/hieund/Documents/BAP/NLN/nln-frontend/docs/foundation/package-scope-evidence.md).
- **Authority order**: `docs/foundation/` (`ARCHITECTURE.md`, `CAPABILITIES.md`, `EXTENSION_CONTRACT.md`, `decisions/`) → current code → `docs/plans/`. Product documents, including the source map, never set foundation policy (`EXTENSION_CONTRACT.md` §10).
- **Build sequence**: [foundation-multi-app-execution.md](file:///home/hieund/Documents/BAP/NLN/nln-frontend/docs/plans/active/foundation-multi-app-execution.md).
- **Product blueprint**: [nln-feature-source-map.md](file:///home/hieund/Documents/BAP/NLN/nln-frontend/docs/product/nln-feature-source-map.md) — intake map of draft specs, read for product scope, not for foundation policy.

<!-- HARNESS:BEGIN -->

## Harness

Start with the requested outcome, then use the repository as the system of
record. Read `docs/WORKFLOW.md` and only relevant product, design, plan, code,
and validation material.

- Answers, explanations, reviews, diagnoses, plans, and status reports are
  read-only. Inspect only what is needed and do not mutate repository or Harness
  state.
- For a bounded change, use an ephemeral plan: inspect the affected behavior and
  proof, implement, and validate. No control-plane operation is required.
- Create or update one file under `docs/plans/active/` when work spans sessions,
  needs coordination, has meaningful dependencies, or requires recovery steps.
  Move it to `docs/plans/completed/` only after validation.
- Before editing, identify repository authority for each new externally
  observable policy. If materially different choices remain open, stop before
  edits; configurable defaults are not authority.
- Report reusable agent friction. Change guidance, tools, runbooks, or validation
  for that purpose only when explicitly asked to use `$improve-harness`.
- Also pause when product intent remains ambiguous, recovery is difficult,
  validation is weakened, or authority is insufficient.
- Claim completion only with relevant executable or observable evidence. Report
  the outcome, important changes, validation, and unresolved risks.

SQLite intake, story, trace, scoring, audit, and proposal commands are optional
compatibility features. Use them only when explicitly requested or required by
an external orchestrator.
<!-- HARNESS:END -->
