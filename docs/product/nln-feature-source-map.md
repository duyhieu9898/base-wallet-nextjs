# NLN Feature Source Map & Multi-Project Foundation Blueprint

## Status and Document Purpose

This document serves as the **master intake map** linking local draft specifications in `docs/local-docs/` to the target product implementations built in this repository: **N+ System** (`apps/n-plus`) and **Neura System** (`apps/neura`) developed in parallel first, followed by **Neura Link System** (`apps/neura-link`).

> **Neura System (`NLN-181_project1-neura`) is IN SCOPE and being developed in parallel with N+ System.** It is a Solana-based NRA ⇄ NRA Staking Platform (Project 1). EVM-based apps (`N+`, `Neura Link`) share `@nln/web3-evm`, while Solana-based apps (`Neura`) will adopt `@nln/web3-solana` when implemented.

It also records **product-side candidates** for a shared Base Foundation Package. Those are candidates, not policy: this is an application/product document, and per `EXTENSION_CONTRACT.md` §10 it cannot set foundation policy. Foundation authority lives in `docs/foundation/` (`ARCHITECTURE.md`, `CAPABILITIES.md`, `EXTENSION_CONTRACT.md`, `FEATURE_MODULE_CONTRACT.md`, `decisions/`, `evm/`); the build sequence lives in [foundation-multi-app-execution.md](../plans/active/foundation-multi-app-execution.md). Where this file and those disagree, they win.

---

## 1. Multi-Project Scope Specifications

```
                               ┌─────────────────────────────────────────┐
                               │     Base Foundation Package (@nln/*)    │
                               │ ┌─────────────────────────────────────┐ │
                               │ │ @nln/web3-evm — wallet · network ·  │ │
                               │ │ read/write hooks · tx lifecycle ·   │ │
                               │ │ error taxonomy · local history      │ │
                               │ └─────────────────────────────────────┘ │
                                                   │
                                  ┌────────────────┴───────────────┐
                                  ▼                                ▼
                  ┌────────────────────────────────┐ ┌────────────────────────────────┐
                  │   N+ System (NLN-1 — đang làm) │ │ Neura Link System (NLN-180 — sau)│
                  │ ────────────────────────────── │ │ ────────────────────────────── │
                  │ • Staking: Flexible USDT       │ │ • Membership: 5 NFT Tiers      │
                  │ • MLM: Unilevel Personal/Team  │ │ • Staking: NRA ⇄ USDT          │
                  │   (no Lending, no NFT tier)    │ │ • MLM: Full 5-Rank / 5-Reward  │
                  └────────────────────────────────┘ └────────────────────────────────┘
```

### 1.1 N+ System (Project 3 — `docs/local-docs/NLN-1_project3-nplus-mlm`) — đang làm

- **Target Applications**: User Web (`apps/n-plus`) & Admin Portal (`apps/n-plus-admin`).
- **Core Focus**: Flexible USDT Staking and Lightweight Team MLM Engine.
- **Membership**: N/A (no NFT requirement).
- **Lending**: N/A (Không có Lending).
- **Staking**: Flexible USDT Staking (1 USDT = 1 PV, min 10 USDT, duy trì tối thiểu 30 ngày để tính PV, P Rank P1–P5 quyết định Unstake Limit).
- **MLM System**:
  - **Tree Structure**: Unilevel Tree (single referrer, immutable ancestry).
  - **2-Dimensional Rank System**: Personal Rank (P Rank dựa trên PV/unstake limits), Team Rank (T Rank dựa trên thành viên & total PV tại L1–L3).
  - **Reward Mechanics**: Team Reward (Unilevel Team Bonus cho T3–T5 tại L1–L3, cơ chế Compression).

### 1.2 Neura Link System (Project 2 — `docs/local-docs/NLN-180_project2-neura-link-mlm`) — sau N+

- **Target Applications**: User Web (`apps/neura-link`) & Admin Portal (`apps/neura-link-admin`).
- **Core Focus**: NFT Membership, High-Yield Staking, and Full Multi-tier MLM Commission Engine.
- **Membership**:
  - Purchase 5 distinct NFT tiers (Bronze, Silver, Gold, Platinum, Diamond) using USDT.
  - Supports incremental membership tier upgrades (paying difference).
- **Staking**:
  - NRA ⇄ USDT pair staking (flexible/locked positions).
  - Dual yield structure: Basic APY + APY boost per NFT tier.
- **MLM System**:
  - **Tree Structure**: Unilevel Tree (3-Level depth scope for rank/rewards, Series logic for Gold+).
  - **5-Dimensional Rank System**:
    1. _NFT Rank_: Based on owned Membership NFT tier.
    2. _Sales Rank_: Based on personal/direct referral sales volume and active series.
    3. _Effective Rank_: `max(Sales Rank, NFT Rank)` derived operational rank for APY & commission qualification.
    4. _Referral Rank_: Based on active direct referral counts.
    5. _Team Rank_: Based on Effective Members in Level 1–3 downline organization.
  - **5-Tier Reward Mechanics**:
    1. _Difference Reward_ (Sales Commission | Stairstep Breakaway).
    2. _Same-rank Bonus_ (Sales Commission | Generation Bonus).
    3. _Upgrade Reward_ (Sales Commission | Upgrade Commission on NFT price difference).
    4. _Staking Referral Reward_ (Direct Referral Bonus).
    5. _Team Reward_ (Unilevel Team Bonus across Levels 1–3).

### 1.3 Neura System (Project 1 — `docs/local-docs/NLN-181_project1-neura`) — Target Product Spec Intake

- **Scope Status**: Target Product Intake / Solana-based Platform (`apps/neura` & `apps/neura-admin`).
- **Description**: Solana-based NRA ⇄ NRA Staking Platform (Multi-Pools, Fixed/Flexible Terms, Claim/Compound, Reservation).
- **Repository Impact**: Triển khai dưới dạng sibling package song song `@nln/web3-solana` (`packages/web3-solana`) khi khởi chạy. Trạng thái hỗ trợ runtime chi tiết xem [`CAPABILITIES.md`](../foundation/CAPABILITIES.md).

---

## 2. Cross-Project Module Comparison Matrix

| Domain Module  | Feature Capability               |   N+ (NLN-1 — đang làm)    | Neura (NLN-181 — Solana)  | Neura Link (NLN-180 — sau) |                    Base Foundation Candidate?                     |
| :------------- | :------------------------------- | :------------------------: | :-----------------------: | :------------------------: | :---------------------------------------------------------------: |
| **Foundation** | Wallet Connect & Auth            |     ✅ (EVM EOA SIWE)      |   ✅ (Solana Sig Auth)    |     ✅ (EVM EOA SIWE)      | `@nln/web3-evm` & `@nln/web3-solana`; App Auth (`features/auth/`) |
| **Foundation** | Transaction Lifecycle & Tracking |     ✅ (EVM Lifecycle)     | ✅ (Solana Confirmation)  |     ✅ (EVM Lifecycle)     |        `@nln/web3-evm` (EVM) & `@nln/web3-solana` (Solana)        |
| **Foundation** | RPC Health & Telemetry           |             ✅             |            ✅             |             ✅             |                 App `reportError` (`0017`) — §4.2                 |
| **Membership** | 5 NFT Tiers Purchase & Upgrade   |             ❌             |            ❌             |    ✅ (Bronze..Diamond)    |                        Application Package                        |
| **Staking**    | Staking Platform                 | ✅ (Flexible USDT Staking) | ✅ (Solana NRA/NRA Pools) | ✅ (NRA/USDT + NFT Boost)  |                 Feature-local — REJECT (§6 evid.)                 |
| **MLM Tree**   | Unilevel Tree Structure          |     ✅ (Unilevel Tree)     |            ❌             |   ✅ (Unilevel + Series)   |                  Backend/indexer — REJECT (§4.3)                  |
| **MLM Rank**   | Rank System                      |   ✅ (Monthly P/T Rank)    |            ❌             | ✅ (NFT/Sales/Effective/T) |                        Application Package                        |
| **MLM Reward** | Referral & Unilevel Team Bonus   |   ✅ (Team Bonus L1-L3)    |            ❌             | ✅ (5-Tier Reward Engine)  |                  Backend/indexer — REJECT (§4.3)                  |
| **Admin**      | Admin Portal & Management        |    ✅ (`n-plus-admin`)     |    ✅ (`neura-admin`)     |  ✅ (`neura-link-admin`)   |              `apps/*-admin` (Vite / `shadcn-admin`)               |

---

## 3. Local Specs Intake Map (`docs/local-docs/`)

### 3.1 N+ MLM System (`docs/local-docs/NLN-1_project3-nplus-mlm/`)

| Local Relative File Path                                 | Content & Requirement Scope Summary                                                                                                                                                                                                                                       | Project Mapping & Target App                       |
| :------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------- |
| `02_docs/01_requirement/01_business-requirement_v1.0.md` | Core business logic: Definitions, Flexible Stake (10–10,000 USDT), Unstake Penalty/Holding (30d), PV Calculation (Monthly snapshot 00:00 1st), P Rank & T Rank Rules, Unlevel Team Bonus, Fee & Admin parameters.                                                         | **N+ System** (`apps/n-plus`, `apps/n-plus-admin`) |
| `02_docs/01_requirement/03_screen-requirement.md`        | Feature breakdown for Guest site (A010000–A040000), User site (B010000–B080000), and Admin site (C010000–C080000). MVP vs Standard screen classification.                                                                                                                 | **N+ System** (`apps/n-plus`, `apps/n-plus-admin`) |
| `02_docs/10_screen-design/A*.md`                         | Guest Site UI/UX specs: Home (`A010100`), Legal (`A010200`), Connect Wallet (`A020100`), Member Registration (`A030000`), Maintenance Page (`A040000`).                                                                                                                   | **N+ System** (`apps/n-plus`)                      |
| `02_docs/10_screen-design/B*.md`                         | User Site UI/UX specs: Overview Dashboard (`B010100`), Quick Actions (`B010200`), Staking (`B020000`), Unstaking (`B030000`), Organization Map (`B040100`), Referral (`B050000`), Rewards (`B060000`), Withdrawal (`B070000`), Wallet History (`B080000`).                | **N+ System** (`apps/n-plus`)                      |
| `02_docs/10_screen-design/C*.md`                         | Admin Site UI/UX specs: Admin Auth (`C010000`), Overview/Analytics (`C020100`–`C020200`), Members & Positions (`C040100`–`C040200`), Tree Visualizer (`C050100`), Rank & Bonus Config (`C060101`–`C060500`), Team Bonus (`C070000`), Reward Vault Management (`C080000`). | **N+ System** (`apps/n-plus-admin`)                |
| `02_docs/api-reference.md`                               | OpenAPI spec for N+ Backend API (26 operations, 33 schemas): `admin`, `admin-auth`, `health`, `positions`, `registration`, `user-auth`.                                                                                                                                   | **N+ System** (MSW Mocks & API Integration)        |

### 3.2 Neura Link MLM System (`docs/local-docs/NLN-180_project2-neura-link-mlm/`)

| Local Relative File Path                                 | Content & Requirement Scope Summary                                                                                                                                                                                                                                                                                                                                         | Project Mapping & Target App                                       |
| :------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------- |
| `02_docs/01_requirement/01_business-requirement_v0.3.md` | Core business logic v0.3: Definitions, NFT Membership (5 Tiers: Bronze to Diamond, prices 500–10,000 USDT, Upgrade rule), NRA ⇄ USDT Staking (4 Lock Periods, APY boost), Unilevel Tree (Series logic, 3-level depth for rank/rewards), 5 Ranks (NFT, Sales, Effective, Referral, Team), 5 Reward Mechanics (Difference, Same-rank, Upgrade, Staking Referral, Team Bonus). | **Neura Link System** (`apps/neura-link`, `apps/neura-link-admin`) |

### 3.3 Neura System (`docs/local-docs/NLN-181_project1-neura/`) — Target Product Spec Intake

| Local Relative File Path                                  | Content & Requirement Scope Summary                                                                                                       | Project Mapping & Target App                                         |
| :-------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------- |
| `02_docs/01_requirement/01_business-requirement_v0.1.md`  | Solana NRA ⇄ NRA Staking Platform business rules (Pools, Positions, Fixed/Flexible terms, Hard-Lock, Conversion Price, APR, Reservation). | **Neura System** (`apps/neura`, `apps/neura-admin` — khi triển khai) |
| `02_docs/01_requirement/03_functions-requirement_v0.1.md` | Functional specifications for Solana wallet management, pool configuration, and staking commands.                                         | **Neura System** (`apps/neura`, `apps/neura-admin` — khi triển khai) |

---

## 4. Base Foundation Package Evaluation & Architecture Strategy

To scale efficiently across **N+ System** and **Neura Link System**, we evaluate building a shared foundation infrastructure inspired by the **Uniswap Monorepo / Multi-Package architecture**.

### 4.1 Transaction Plan Engine (`@nln/transaction-planner`)

> [!NOTE]
> **Candidate — DEFER.** This is a product-side observation, not an accepted
> foundation policy. Current verdict and evidence:
> [package-scope-evidence.md §4](../foundation/package-scope-evidence.md).
>
> **Promote trigger**: at least **two implemented feature consumers** sharing the
> same approval preflight and the same two-step UX, each with a real contract ABI
> and deployment address — not `TestStakingVault test-v1`. Today there is exactly
> one (`features/staking/hooks/use-staking-write`), so `EXTENSION_CONTRACT.md` §5
> conditions 1 and 3 are unmet. Approval orchestration stays feature-local until
> then (`0015`).

#### Observed shape (why it looks shared):

1. **Multi-step Web3 Workflows**:
   - _Neura Link (P2)_: Buying or upgrading Membership NFT requires: `USDT.approve(spender, amount)` ➔ `NFTMarketplace.buyOrUpgrade(tierId)`.
   - _Neura Link (P2)_: Staking NRA ⇄ USDT requires: `USDT.approve(stakingContract, amount)` ➔ `StakingPool.stake(amount)`.
   - _N+ (P3)_: Flexible USDT Staking requires: `USDT.approve(stakingContract, amount)` ➔ `StakingPool.stake(amount)`.

   Shared **shape** is not a shared invariant: membership upgrade carries a prior
   tier, N+ staking carries PV accrual and a rank-derived unstake limit, Neura
   Link staking carries lock duration and an NFT-tier APY boost. Collapsing them
   early is what `EXTENSION_CONTRACT.md` §5.4 forbids.

2. **Standardized Transaction State Pipeline**:
   - Per-flow lifecycle already owned by the foundation (`0008`) and reviewed
     before submission via `Prepare → Review → Confirm` (`0011`).
   - Standardized user error messaging (e.g. `USER_REJECTED`, `INSUFFICIENT_FEE`)
     through the existing error taxonomy (`0004`, `0017`).

> [!CAUTION]
> **Out of scope — do not implement.** These were previously listed here and
> conflict with foundation authority:
>
> - _Automated allowance checking to bypass approval_ — `0015`: approval and the
>   primary transaction are distinct user-authorized steps; the foundation "does
>   not automatically approve and then submit a primary action in one opaque user
>   interaction".
> - _Universal transaction execution graph accepting any contract call_ —
>   `CAPABILITIES.md` non-goal ("become a universal transaction engine"); `0015`
>   Boundaries admit no `useTransaction` taking an arbitrary ABI.
> - _Nonce management / replacement_ — `0008` Boundaries: out of baseline.

---

### 4.2 RPC Strategy & Web3 Observability (`@nln/rpc-observability`)

> [!NOTE]
> **Candidate — DEFER.** Measured today: `grep -rln "reportError\|observability" src/`
> returns 0 hits, and RPC fallback has 0 implemented consumers
> ([package-scope-evidence.md §5](../foundation/package-scope-evidence.md)).
>
> **Promote trigger**: a real RPC provider vendor plus real load numbers, and the
> six open questions in `CAPABILITIES.md` answered — provider ownership, failover
> policy, retry budget, rate-limit semantics, observability, consistency
> requirements. Until then `viem`'s `fallback()` transport is a config-level
> answer inside `@nln/web3-evm` (§5.1 there), not a package. Telemetry belongs to
> the application `reportError` boundary (`0017`); no vendor adapter before a real
> production deployment.
>
> Silent fallback that hides a read failure stays forbidden either way
> (`ARCHITECTURE.md` §2, "No fake fallback").

#### Observed need (why it is on the list):

1. **RPC Reliability & Failover Pools**:
   - Web3 dApps handling MLM unilevel queries and live APY updates incur heavy RPC call volumes.
   - Provides a multi-endpoint RPC fallback pool (Primary RPC ➔ Backup RPC 1 ➔ Backup RPC 2) with automated health scoring and latency ranking.
   - Mitigates rate-limiting (`429 Too Many Requests`) via client-side request batching and exponential backoff strategies.
2. **Web3 Observability & Telemetry**:
   - Structured logging of RPC error rates, payload response times, and contract call failures.
   - Real-time transaction performance tracking (Time-to-Mempool, Time-to-Block Confirmation).
   - Unified telemetry collector compatible with Sentry / Datadog for production monitoring across all 4 applications.

---

### 4.3 Modular Cross-Application Package Architecture (Uniswap Model)

> [!NOTE]
> **Candidate list — one package accepted, the rest DEFER/REJECT.** The
> repository shape (pnpm workspace monorepo) is settled by
> [foundation-multi-app-execution.md §1](../plans/active/foundation-multi-app-execution.md);
> that plan is the authority for _how_ the workspace is built. What is **not**
> settled is this package list. Per-package verdicts and their evidence live in
> [package-scope-evidence.md §6](../foundation/package-scope-evidence.md).

| Proposed package           | Verdict                  | Promote trigger                                                                         |
| :------------------------- | :----------------------- | :-------------------------------------------------------------------------------------- |
| `@nln/web3-evm`            | **Accepted** — Track 0/1 | Already the single foundation. Named `web3-evm`, not `web3-core`: it is EVM-only (§9.2) |
| `@nln/transaction-planner` | **DEFER**                | ≥2 implemented consumers with real ABIs and the same approval invariant (§4.1)          |
| `@nln/rpc-observability`   | **REJECT**               | Real vendor + real load numbers + `0017` production requirement (§4.2)                  |
| `@nln/mlm-sdk`             | **REJECT**               | 0 lines of MLM code exist; no contract, no API contract, no consumer                    |
| `@nln/ui-components`       | **DEFER**                | Real duplication across ≥2 apps; today 4 shadcn primitives, 1 consumer                  |
| `@nln/staking-sdk`         | **REJECT**               | Real staking ABI + address beyond `TestStakingVault test-v1`                            |

Do **not** create a universal `@nln/web3-core` before a second chain-family
runtime actually exists; a Solana runtime, when required, becomes a parallel
`packages/web3-solana` rather than an addition to `web3-evm`.

#### What the workspace actually buys:

- **One foundation source for all 4 apps**: fixing `@nln/web3-evm` does not mean bumping a version in multiple places.
- **Independent Application Deployment**: 4 deployment units, each with its own env, build, domain and rollback — verified by the spike in execution plan §5.5, not assumed.
- **Enforced boundaries**: `app A ↛ app B` and `product ↛ admin` are ESLint-enforced, because in a workspace those imports resolve for real.

> [!WARNING]
> The first question for any new `@nln/*` package is **"has a second consumer
> been implemented?"** — not "does it sound reasonable?".

---

## 5. Next Steps & Implementation Roadmap

1. **Phase 1 (Foundation Package Hardening)**:
   - Track 0 package-readiness on `@nln/web3-evm` (config injection, no module-load init, UI/i18n decoupling, two-tier history), then Track 1 workspace migration. See execution plan §4–§5.
   - `@nln/transaction-planner` and `@nln/rpc-observability` are **not** in this phase — see the verdicts in §4.
2. **Phase 2 (N+ System Implementation — `apps/n-plus` & `apps/n-plus-admin`)**:
   - Implement Flexible USDT Staking and Personal/Team Rank Unilevel MLM. No Lending, no NFT membership — see §1.1.
3. **Phase 3 (Neura Link System Implementation — `apps/neura-link` & `apps/neura-link-admin`)**:
   - Implement NFT Membership (5 tiers + upgrade), NRA ⇄ USDT Staking, and full 5-Rank / 5-Reward Unilevel MLM.
