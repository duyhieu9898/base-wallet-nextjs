# Solana Runtime Requirement Record

`CHAIN_FAMILY_TEMPLATE.md` requires an approved application requirement written
down **before** any code is written for a new chain family. Without it,
`@nln/web3-solana` is not authorised to start and `CAPABILITIES.md` cannot list
Solana above `Deferred`.

Status: **phase 1 implemented, phase 2 unblocked.** `packages/web3-solana/`
exists and reads live devnet balances, so Solana is `In Progress` in
[`CAPABILITIES.md`](CAPABILITIES.md). Item 3 was accepted on 2026-08-07 — see
"Item 3 acceptance" at the end of this record. Build state:
[`solana-runtime.md`](../plans/active/solana-runtime.md).

Source specification:
`docs/local-docs/NLN-181_project1-neura/02_docs/01_requirement/`
(`01_business-requirement_v0.1.md`, `03_functions-requirement_v0.1.md`).
Every claim below is cited; anything the spec does not answer is marked **OPEN**
rather than guessed.

## Application requirement

The Neura System — `apps/neura` (product) and `apps/neura-admin` (operator
console) — is a Solana staking platform. EVM cannot serve it: the product is
specified against SPL tokens, program-derived vaults and Solana program
instructions, not ERC-20 contracts.

Product scope summary:
[`../product/nln-feature-source-map.md`](../product/nln-feature-source-map.md) §1.3.

### What the runtime must support

- multiple independent pools, each with its own stake token, reward token, stake
  vault and reward vault (§3);
- one position per stake action — positions are never merged, topped up or
  transferred, and the owner is immutable (§4, Definitions);
- `stake`, `unstake`, `claim`, `compound` as member-initiated instructions, plus
  `fund_rewards` which **anyone** may call (§10 table);
- an admin surface calling `initialize`, `propose_admin`, `accept_admin`,
  `set_treasury`, `set_global_pause`, `create_pool`, `update_pool`,
  `set_pool_pause`, `cancel_pool`, `close_pool`, `withdraw_excess_rewards`,
  `withdraw_excess_stake` (§10 table).

Instruction names are snake_case and the program has an upgrade authority, so the
program is Anchor-shaped. The frontend consumes it; it does not own it.

## Three constraints that change frontend architecture

These are not staking details. They shape what the runtime package may and may
not do, so they are recorded before design starts.

### 1. There is no on-chain history

> Hệ thống on-chain chỉ giữ **trạng thái hiện tại**, không giữ lịch sử. Toàn bộ
> lịch sử giao dịch, biểu đồ TVL, báo cáo doanh thu phải do **indexer off-chain**
> dựng lại từ các sự kiện hệ thống. (§10, and Notes & Assumptions 7)

Consequences:

- Screens `B040300 Position History` and `B040401 Wallet History` cannot be
  served by reading chain state. They need the indexer, which is a **backend**
  concern — `CAPABILITIES.md` already lists indexer as a non-goal of the
  foundation, and that does not change here.
- `@nln/web3-solana` must not grow an event-scanning or log-replay layer to
  compensate. If it does, it has become an indexer.
- The EVM answer to local history (decision `0012`) does not port. It reconciles
  pending entries against receipts; Solana's confirmation model and the absence
  of on-chain history make that a different problem, and it needs its own
  decision when the need is real.

### 2. Nothing settles by itself

> Solana không có cron on-chain — Member **phải tự bấm**. Không bấm thì không có
> gì xảy ra. (§8)

Accrued reward is not settled reward. The runtime and every feature built on it
must present accrued value as a claim the user still has to make, never as a
balance already received. Rendering it as settled would be the "fake fallback"
that `ARCHITECTURE.md` §2 forbids.

### 3. Reward is reserved at stake time, and the reservation can reject the stake

> Ngay khi Stake, hệ thống tính Reward tối đa của Position và **giữ chỗ** trước
> trong Reward Vault. Nếu Reward Vault không đủ chỗ trống, lệnh Stake bị từ chối
> (`InsufficientRewardLiquidity`). (Definitions, §4)

Pool capacity is therefore a moving quantity, and a stake can fail for a reason
the user cannot see in their own balance. The spec asks the web app to surface
remaining capacity **before** submission (§Edge Case 3, and §9). That is a
preflight requirement on the write path, not a UI nicety — it belongs in the
same place as obligation 1 of `FEATURE_MODULE_CONTRACT.md` §5.

## The seven pre-code decisions

`CHAIN_FAMILY_TEMPLATE.md` §"Before writing code" requires all seven. Each OPEN
item must be closed before the code it governs is written, and this record
updated in the same change.

### 1. Supported networks and wallet connectors

- **OPEN — cluster.** Devnet for development is assumed; the production cluster
  is a customer decision and must not be hardcoded into the package, exactly as
  the EVM runtime does not hardcode its production chain.
- **OPEN — wallet connector.** The spec requires connect, disconnect, ownership
  proof by signature and session persistence (§1) but names no wallet or adapter
  library.

  Prior art rather than a decision: `../interface` uses
  `@solana/wallet-adapter-react` with `@solana/web3.js`, and keeps signing behind
  a single registered function (`apps/web/src/connection/signSolanaTransaction.tsx`)
  so the rest of the app never touches the adapter directly. That shape matches
  this repository's own boundary rules — the wallet stays behind the runtime
  package's public API — and is the obvious starting point unless something
  argues against it.

### 2. Account/identity model and authentication

Decided by the spec:

- the wallet address is the identity; there is no password (§2);
- ownership is proven by wallet signature, and a login session is bound to the
  verified wallet address (§1, §2, screen `A020100`);
- admin identity is on-chain: `initialize` runs once, callable only by the wallet
  holding the program upgrade authority, and admin transfer is a two-step
  `propose_admin` / `accept_admin` (§10). The console authorises against chain
  state, not against a role table.

**OPEN — and the spec says so itself:**

> Wallet Management & Authentication ở mức tối giản: … chưa có đặc tả chi tiết
> (thời hạn session, cơ chế chữ ký, xử lý lỗi…). Cần bổ sung input trước khi viết
> Screen Requirements hoặc API spec. (Notes & Assumptions 5)

So the signed-message format, its replay protection and session lifetime are
unanswered **in the product spec**, not merely undecided here. This needs product
input before the auth feature is built. It does not block the runtime package,
because authentication is application-owned in this architecture — SIWE lives in
`apps/n-plus/src/features/auth/`, not in `@nln/web3-evm`, and the Solana
equivalent belongs in `apps/neura` the same way.

### 3. Read, write, preflight and confirmation semantics

**This is the blocking item.** `ARCHITECTURE.md` §6 requires every family to
define its own terminal confirmation evidence and forbids concluding success
without it. EVM's answer is receipt status. Solana's answer is different and must
be stated before any write path exists, because obligations 1, 2, 6 and 8 of
`FEATURE_MODULE_CONTRACT.md` §5 have no mechanism to point at until it is.

What has to be decided, and the recommendation for each:

| Question                                     | Recommendation                                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Which commitment counts as terminal evidence | `finalized`. `confirmed` is fast but reorg-able, and this app moves user funds                  |
| What `confirmed` is allowed to drive         | Optimistic UI only — never a success conclusion, never a once-per-signature side effect         |
| What a signature alone proves                | That the transaction was submitted. Nothing else. It is the EVM hash, and it is not evidence    |
| Expired blockhash                            | A distinct terminal state, not an error and not a success — the transaction will never land     |
| Preflight                                    | `simulateTransaction` against the connected account, mapping Anchor error codes to typed errors |
| Dropped transaction                          | Needs an explicit timeout policy and a user-visible "not landed" state                          |

> **Superseded.** The recommendations in the table above were not adopted. See
> "Item 3 acceptance" at the end of this record for the decision that governs:
> `confirmed` is terminal evidence for user-facing flows. The table is kept
> because the reasoning against it is what the accepted decision had to answer.

The recommendation was `finalized` because the alternative fails in exactly the
way this product cannot tolerate: a `confirmed` claim that later reorgs would
have shown the user a reward they did not receive, and would have run
once-per-signature side effects for a transaction that never happened. The
accepted decision answers this with indexer reconciliation rather than with a
slower commitment.

#### Evidence from a production Solana frontend, including what weakens the above

`../interface` (clone of `Uniswap/interface`) ships live Solana support. Two
findings, and they do not both point the same way.

It documents the trade-off in
`packages/uniswap/src/data/solanaConnection/getSolanaParsedTokenAccountsByOwnerQueryOptions.ts`:

| Level       | Time    | Safety                                 |
| ----------- | ------- | -------------------------------------- |
| `processed` | ~400ms  | ~5% rollback risk                      |
| `confirmed` | ~1-2s   | No rollback in Solana's 5-year history |
| `finalized` | ~12-13s | Completely irreversible                |

They use `confirmed` for on-chain balance reads, explicitly so the balance
updates quickly after a swap.

This is a real argument against a blanket `finalized`: 12-13 seconds of waiting
on every claim, unstake and compound is a material UX cost, and the rollback risk
being defended against has not been observed in five years. Whoever decides item
3 should weigh that rather than take the recommendation above at face value. A
defensible middle is `confirmed` as terminal evidence for user-facing flow with
`finalized` reserved for anything irreversible or reconciled against money — but
that split has to be a decision, not a default.

The second finding is why this reference cannot settle the question. In
`apps/web/src/state/sagas/transactions/solana.ts` the swap path sends through the
**Jupiter execute API** and marks `TransactionStatus.Success` from Jupiter's
`status` field, then refetches balances after a fixed 3-second delay with the
comment that the transaction "hasn't been fully confirmed yet". They never run
their own commitment-level confirmation loop — they outsourced terminal evidence
to an aggregator.

Neura talks directly to an Anchor program. There is no aggregator to outsource
to, so this decision has to be made here and cannot be copied.

**This is a recommendation, not a decision.** Someone with authority over the
product has to accept it — or accept `confirmed`, with the reasoning recorded —
and this record has to be updated with that acceptance under
"Item 3 acceptance" below.

The gate is **any write path**, not the package. An earlier version of this
sentence blocked creating `packages/web3-solana/` at all; the phase split lifted
that, because the read half encodes no commitment policy. The package now exists
and reads live devnet balances.

**This item has since been accepted** — see "Item 3 acceptance" at the end of the
record. The gate is closed and phase 2 may proceed.

### 4. RPC provider, rate limit and failure policy

- **OPEN.** The same six unanswered questions that keep RPC health deferred for
  EVM apply here (`CAPABILITIES.md`, "RPC health và fallback"): provider
  ownership, failover policy, retry budget, rate-limit semantics, observability,
  consistency requirements.
- Solana adds one the EVM runtime never faced: a `finalized` commitment costs
  latency, so the read path and the write-confirmation path may legitimately want
  different commitments. That choice is part of item 3, not a tuning knob.

### 5. Asset metadata source and validation

Decided by the spec:

- assets are **standard SPL tokens**; Token-2022 is explicitly not supported;
- decimals ≤ 18, and stake-token decimals may differ from reward-token decimals
  (§3, constraint 6, `InvalidMintDecimals`).

The decimals mismatch is a correctness requirement, not a display concern: the
spec records that skipping the decimal conversion underpays rewards by a factor
of 1,000 **with no error raised** (§Edge Case 5). Registry validation must check
declared decimals against on-chain mint metadata.

**Correction.** An earlier version of this paragraph said "as the EVM registry
does for ERC-20". That is not accurate: `hydrateTokens` in `@nln/web3-evm`
validates the _shape_ of `expectedDecimals` at boot — integer, non-negative — and
never compares it against the contract. Solana implements the on-chain
comparison first, in `fetchTokenBalances`, because this spec calls the
consequence out explicitly. Whether the EVM runtime should gain the same check is
a separate question and not addressed here.

- **DECIDED** — the token registry is application-owned and injected, identical
  to the EVM runtime: `apps/neura/src/config/solana.config.ts` holds the mints
  and the package holds only the schema and its validation.
- **OPEN** — the metadata source of record for populating that registry
  (on-chain metadata program, a curated list, or the backend).

### 6. Program ownership and deployment verification

Known: the instruction set (§10), Anchor-shaped naming, and that admin authority
derives from the program upgrade authority.

- **OPEN** — program IDs per cluster, IDL ownership and versioning, and how a
  deployment is verified.

Per decision `0016` the deployment registry belongs to the application and the
interface belongs to the feature that uses it — the package owns neither. The IDL
is Solana's equivalent of an ABI and follows the same rule.

### 7. Test network, live-read smoke and safe write verification

- **OPEN.** The Solana equivalents of the four proof boundaries in decision
  `0010`. The layering is family-neutral and already applies; only the scripts
  and the test cluster are undecided.

## What the eight feature obligations need from this runtime

`FEATURE_MODULE_CONTRACT.md` §5 states obligations; each runtime supplies the
mechanism. This is the checklist the implementer has to fill, not a design.
Obligations 3, 4, 5 and 7 are behavioural and already satisfied by any correct
implementation; 1, 2, 6 and 8 need a Solana answer, and all four depend on item 3
above.

| #   | Obligation                  | What Solana must supply                                                       |
| --- | --------------------------- | ----------------------------------------------------------------------------- |
| 1   | Preflight readiness         | Wallet/cluster readiness, plus remaining pool capacity (see constraint 3)     |
| 2   | Preflight simulation        | `simulateTransaction` with the connected account, before any signature prompt |
| 3   | Review before confirm       | Behavioural — unchanged                                                       |
| 4   | Duplicate-submit guard      | Behavioural — unchanged; keyed on signature rather than hash                  |
| 5   | Stale-operation isolation   | Reset on change of account, cluster, pool or position                         |
| 6   | Terminal evidence only      | **Blocked on item 3**                                                         |
| 7   | Once-per-submission effects | Behavioural — keyed on the terminal reference item 3 defines                  |
| 8   | Targeted cache invalidation | Which account subscriptions a landed instruction invalidates                  |

## Boundaries this record does not relax

- `@nln/web3-solana` is a **sibling** package of `@nln/web3-evm`. Not a folder
  inside it, not a subclass of it.
- No EVM type crosses over — not `EvmAddress`, not transaction references, not
  wallet-selection state, not the token model.
- No `packages/web3-core`, `web3-universal` or `multi-chain` package. No
  universal `sendTransaction`. Two implemented runtimes proving identical
  semantics is the only trigger, and there is currently one.
- Existing EVM decisions are not rewritten to cover Solana. Solana writes its own
  decisions under `docs/foundation/solana/decisions/`, and only when the
  corresponding semantics are actually implemented — creating the directory empty
  would be documentation ahead of evidence.

  **Done 2026-08-07.** Phase 1 implemented real semantics, so the read-path
  decisions were promoted out of the execution plan into
  [`solana/decisions/`](solana/decisions/README.md). This mattered because of the
  authority order in `AGENTS.md` — `docs/foundation/` → code → `docs/plans/` — so
  a decision living only in a plan sat at the **lowest** authority and a later
  session would have been entitled to overrule it.

  | Semantics                                                   | Now recorded in |
  | ----------------------------------------------------------- | --------------- |
  | `confirmed` as terminal evidence, indexer reconciles        | this record     |
  | Selection has no `unsupported` state; cluster is app-chosen | `0018`          |
  | Balance reads are registry-driven, SPL only, zero-filled    | `0019`          |
  | Declared decimals verified against the on-chain mint        | `0020`          |
  | `isValidAddress` accepts PDAs; signing needs on-curve       | `0021`          |

  The confirmation-evidence decision stays here rather than becoming a decision
  record, because no write path exists yet to describe. It moves when phase 2
  implements one.

- Solana does not need i18n, toast, reusable components or a dev harness to count
  as a runtime. Definition of done is in `CHAIN_FAMILY_TEMPLATE.md` and lists none
  of those.
- The package is not an indexer. See constraint 1.
- **No allowance or approval surface.** Solana has no ERC-20 spender model; an
  Anchor program signs with PDA authority. `@nln/web3-evm`'s `reads/allowances`
  and `transactions/erc20-approval` subtrees have no Solana counterpart and are
  not to be translated into one. `@nln/web3-solana` is therefore materially
  smaller than the EVM runtime — that is the correct shape, not missing work.

## Out of scope for v0.1

The spec excludes five items as unconfirmed blockers (§Notes & Assumptions 3):
pause scope (Q-2), emergency exit from a hard lock (Q-3), APR ceiling (Q-4), the
20% reward-to-wallet ratio (Q-5), and lockup bonus tiers of 6/12/24 months (Q-6).

Q-6 is the one to watch: the spec notes that member-chosen lock terms would be a
large architecture change. Do not build toward it speculatively.

## Status transitions

| From          | To            | Trigger                                              |
| ------------- | ------------- | ---------------------------------------------------- |
| `Deferred`    | `Planned`     | This record — done                                   |
| `Planned`     | `In Progress` | `packages/web3-solana/` exists                       |
| `In Progress` | `Ready`       | `CHAIN_FAMILY_TEMPLATE.md` definition of done is met |

An earlier version of this table required item 3 before the package could exist.
That was stricter than the risk warrants: the read half of the runtime — registry,
address, connection, provider, wallet selection, balances, errors — does not
encode a commitment policy and cannot be made wrong by item 3 landing either way.
Blocking it stalled ready work for a decision it does not depend on.

**Item 3 still gates every write.** No simulation gate, write lifecycle, terminal
status derivation, transaction history, or post-write invalidation may be written
until item 3 is recorded as accepted below, because each of those encodes the
chosen commitment level. The phase boundary is in
[solana-runtime.md](../plans/active/solana-runtime.md).

The other OPEN items must be closed before the code each one governs is written,
not necessarily before the package is created.

### Item 3 acceptance

**Accepted 2026-08-07 by hieund: `confirmed` is terminal evidence for
user-facing flows.**

Reasoning given: follow the approach of a production application with many users
and a track record, rather than a stricter policy chosen in the abstract. The
`finalized` recommendation earlier in this section is therefore **not** adopted
as a blanket rule.

#### What this does and does not inherit from the reference

Stating this precisely matters, because the reference is weaker evidence than it
first appears and a later reader should not over-trust it.

What Uniswap actually demonstrates is that **`confirmed` is safe enough to drive
balance reads** in a high-volume production application. That is a real, tested
signal and it is what this decision rests on.

What it does not demonstrate is a write-confirmation policy, because it has none:
its swap path delegates to the Jupiter execute API and marks success from
Jupiter's response (see the section above). Extending `confirmed` from reads to
terminal write evidence is **our** decision, not an inherited one.

One difference in consequence profile is worth recording, since it is the reason
the earlier recommendation existed. A reorged swap means the swap did not happen
and the next balance refetch corrects the display. A reorged claim in Neura would
also have run once-per-signature side effects — reward marked claimed, history
row written — and those do not self-correct. The mitigation is below, not a
reopening of the decision.

#### Consequences to implement in phase 2

| Question                      | Accepted answer                                                                                |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| Terminal evidence             | `confirmed`                                                                                    |
| What a signature alone proves | Submission only. It is the EVM hash and must never conclude success                            |
| Expired blockhash             | Distinct terminal state — not success, not error. The transaction can never land               |
| Dropped transaction           | Explicit timeout with a user-visible "not landed" state                                        |
| Preflight                     | `simulateTransaction` against the connected account, Anchor error codes mapped to typed errors |
| Once-per-signature effects    | Keyed on signature, run at `confirmed`                                                         |

**Reconciliation, not a second commitment level.** Constraint 1 of this record
already establishes that Solana keeps no on-chain history, so an indexer is
required regardless. That indexer is the system of record for balances and
history, and it reads at `finalized` by construction. The frontend showing
`confirmed` is therefore an optimistic view that a `finalized` source corrects,
which covers the reorg case without charging every user 12-13 seconds.

This means phase 2 must not treat the frontend's `confirmed` conclusion as the
durable record of a claim. Where the two disagree, the indexer wins.
