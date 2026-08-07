# Execution Plan: Build `@nln/web3-solana`

Date: 2026-08-07

## Status

Active — phase 1 complete and verified against live devnet. Item 3 accepted on
2026-08-07, so phase 2 is unblocked.

## Outcome

A sibling runtime package to `@nln/web3-evm` that gives `apps/neura` what
`@nln/web3-evm` gives `apps/n-plus`: a network/token registry, a provider, wallet
selection, read hooks, an error taxonomy, and — after item 3 is decided — a write
lifecycle with terminal confirmation evidence.

Observable result for phase 1: `apps/neura` connects a Solana wallet and displays
a live SOL balance and a live SPL token balance read from devnet, with
`pnpm typecheck`, `pnpm lint`, `pnpm test:run` passing.

## Context

- Requirement and gating record:
  [solana-runtime-requirement.md](../../foundation/solana-runtime-requirement.md)
- Family isolation rules: [ARCHITECTURE.md](../../foundation/ARCHITECTURE.md),
  [EXTENSION_CONTRACT.md](../../foundation/EXTENSION_CONTRACT.md)
- Reference implementation: `../interface` (pristine `Uniswap/interface` clone) —
  see "What the reference does and does not teach" below.
- The EVM counterpart is `packages/web3-evm/`. Read its `src/index.ts` for the
  shape of a finished runtime boundary, not for types to copy.

### What the reference does and does not teach

`../interface` ships working Solana code, but it is a **connection client, not a
runtime package**. The whole of it is four files:

| File                                                                       | Teaches                                       |
| -------------------------------------------------------------------------- | --------------------------------------------- |
| `features/providers/getSolanaConnection.ts`                                | `Connection` singleton, `fetch` wrapper       |
| `utilities/src/addresses/svm/svm.ts`                                       | `PublicKey` validation                        |
| `data/solanaConnection/getSolanaParsedTokenAccountsByOwnerQueryOptions.ts` | SPL balance read, both token programs         |
| `features/wallet/connection/connectors/solana.ts`                          | wallet-adapter select/connect, event wrapping |

It contains no simulation gate, no review step, no write lifecycle, no history,
and no cache invalidation — the half of `@nln/web3-evm` that carries the safety
invariants. The reason is structural: `apps/web/src/connection/signSolanaTransaction.tsx`
signs, and `state/sagas/transactions/solana.ts` hands the signed transaction to
the **Jupiter execute API** and marks success from Jupiter's response field.

Neura talks directly to an Anchor program. There is no aggregator to delegate
confirmation to, so **the reference cannot settle item 3** and must not be cited
as if it had.

## Scope

In scope:

- `packages/web3-solana/` as a sibling package, phases 1 and 2 below.

Out of scope:

- Any allowance or approval surface. Solana has no ERC-20 spender model; Anchor
  programs sign with PDA authority. The entire `reads/allowances` and
  `transactions/erc20-approval` subtree of `@nln/web3-evm` has **no counterpart**
  and is not to be invented.
- An indexer. See requirement record constraint 1.
- Any shared/core/universal package.
- Drive-by changes to `@nln/web3-evm`. This bars **editing** it from Solana work,
  not noticing things about it: phase 1 found that `hydrateTokens` never compares
  declared decimals against the ERC-20 contract, and that finding is recorded in
  the requirement record rather than dropped. Raise, do not silently fix, and do
  not stay quiet either.
- The five v0.1 exclusions listed in the requirement record.

## Approach

Two phases, split by whether the work depends on item 3.

### Phase 1 — reads and infrastructure (no dependency on item 3)

| Step | Area               | Solana form                                                   | Reference |
| ---- | ------------------ | ------------------------------------------------------------- | --------- |
| 1    | package scaffold   | manifest, exports map, tsconfig, vitest — mirror EVM's layout | EVM       |
| 2    | `config/`          | runtime config injection, React-free and adapter-free         | EVM       |
| 3    | `address/`         | `PublicKey` validate/shorten/compare                          | Uniswap   |
| 4    | `chain/registry/`  | cluster + SPL mint registry, explorer URLs                    | EVM shape |
| 5    | `clients/`         | `Connection` factory                                          | Uniswap   |
| 6    | `provider/`        | `SolanaProvider` over `@solana/wallet-adapter-react`          | Uniswap   |
| 7    | `chain/selection/` | wallet + cluster readiness                                    | both      |
| 8    | `reads/balances/`  | native `getBalance`, SPL `getParsedTokenAccountsByOwner`      | Uniswap   |
| 9    | `errors/`          | Solana RPC + Anchor error code taxonomy, rejection detection  | EVM shape |

Phase 1 ends with a live devnet read proven by a smoke script, mirroring
`packages/web3-evm/src/testing/evm-smoke.ts`.

### Phase 2 — writes

Item 3 is accepted: **`confirmed` is terminal evidence for user-facing flows**,
with the indexer as the durable record that corrects a reorg. Full reasoning and
the sub-answers (expired blockhash, dropped transaction, preflight,
once-per-signature effects) are in the requirement record under "Item 3
acceptance".

Simulation gate, review model, write lifecycle, terminal confirmation evidence,
history, and targeted invalidation. `deriveEvmWriteStatus` keys on
`receiptStatus`; the Solana equivalent keys on reaching `confirmed` for the
submitted signature, and must treat an expired blockhash as its own terminal
state rather than as an error.

The one rule that outlives the decision: the frontend's `confirmed` conclusion is
optimistic, not the durable record of a claim. Where it and the indexer disagree,
the indexer wins.

#### Confirmation mechanism

`@solana/web3.js` already supplies the shape, verified present in the installed
1.98.4: `confirmTransaction` accepts a
`BlockheightBasedTransactionConfirmationStrategy`
(`{ signature, blockhash, lastValidBlockHeight }`) and rejects with
`TransactionExpiredBlockheightExceededError`.

That error **is** the "expired blockhash" terminal state the accepted decision
calls for. A blockhash lives ~150 blocks, so the chain defines the deadline and
the runtime does not invent a timeout of its own. Do not replace this with a
wall-clock timer.

#### Transaction landing — three items that are not the commitment decision

Solana drops transactions under load. This is ordinary, not an edge case, and it
is the part the Uniswap reference never had to solve because Jupiter's execute
API absorbs it. Choosing `confirmed` does nothing for a transaction that never
reached a leader.

| Item               | What phase 2 must do                                                                                                                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rebroadcast        | Send with `maxRetries: 0`, re-send the **same signed transaction** every ~2s until confirmed or the blockhash expires. Re-sending one signature is idempotent — it cannot execute twice. Leaving retries to the RPC gives up control of when to stop |
| Priority fee       | `ComputeBudgetProgram.setComputeUnitPrice`, sized from `getRecentPrioritizationFees`. Without it, congestion pushes the transaction behind and the drop rate climbs sharply                                                                          |
| Compute unit limit | `setComputeUnitLimit` sized to the instruction rather than the 200k default — cheaper and easier to schedule                                                                                                                                         |

Left out, these do not fail loudly. They surface as "the transaction sometimes
does not go through", which is expensive to diagnose after the fact.

Confidence: the `confirmTransaction` mechanism above is verified against the
installed SDK. The three landing items are ecosystem practice, not read from
another codebase in this environment — no comparable Solana application is
checked out here.

## Risks And Recovery

- **Writing phase 2 before item 3 is decided.** The first lifecycle implementation
  silently becomes the default commitment policy, which means a decision about
  user funds gets made by typing order rather than by anyone accepting it. Recovery
  is expensive because the choice spreads into history, invalidation, and UI copy.
  Mitigation: phase 2 does not start until the requirement record shows item 3
  accepted.
- **Copying EVM types across.** Prohibited by the requirement record's boundaries.
  Mitigation: phase 1 introduces no import from `@nln/web3-evm`; a lint boundary
  test should assert this once the package exists.
- **Reference drift.** `../interface` is an upstream clone with no local commits.
  Anything copied from it must be understood, not vendored; it targets mainnet
  through Jupiter and its trade-offs are not automatically ours.

## Progress

- [x] `apps/neura` scaffolded — Vite + TanStack Router shell on port 3002, no
      runtime wired. Built ahead of the package so phase 1 has a real host to
      render into instead of proving reads only through a node script.
- [x] Step 1 — package scaffold, `@solana/web3.js` v1 pinned by the
      wallet-adapter peer range
- [x] Step 2 — `config/` cluster registry injection with construction-time
      validation
- [x] Step 3 — `address/` base58 primitives, including the on-curve/PDA split
- [x] Step 4 — `chain/registry/` cluster and SPL mint selectors
- [x] Step 9 — `errors/` taxonomy (read-phase codes only)
- [x] Import boundaries — sibling isolation enforced by ESLint and proven
      against fixture violations in both directions
- [x] Step 5 — `clients/` Connection factory, cached per cluster and endpoint,
      plus `assertSolanaClusterIdentity` over genesis hash
- [x] Step 6 — `provider/` over `@solana/wallet-adapter-react`, Wallet Standard
      auto-detection, no per-wallet adapter packages
- [x] Step 7 — `chain/selection/`
- [x] Step 8 — `reads/balances/` native + SPL across both token programs
- [x] `apps/neura` wired to the runtime and rendering live cluster state
- [x] Phase 1 devnet read smoke — `pnpm solana:smoke`, verified against live
      devnet: genesis hash matched, 274.03 SOL and 267 token accounts read in
      250ms, including the registry's USDC entry resolved by symbol
- [x] Balance reads made registry-driven, matching `@nln/web3-evm` — one entry
      per enabled registry token, zero-filled, unknown mints discarded. An
      earlier version copied the reference's enumerate-the-wallet approach and
      produced 266 `UNKNOWN` rows against a real devnet account
- [x] Token-2022 program dropped from the balance query — item 5 states the
      product does not support it
- [x] Declared decimals cross-checked against the on-chain mint, verified by
      mutation: setting USDC to 9 raises `TOKEN_METADATA_MISMATCH` against the
      real devnet mint
- [x] Browser verification — the same reads run in a real browser against the dev
      server and return identical values
- [x] Item 3 accepted and recorded — `confirmed` as terminal evidence for
      user-facing flows, with indexer reconciliation as the reorg answer.
      **Phase 2 is unblocked.**
- [ ] Phase 2

## Decisions

Read-path semantics were promoted to foundation authority on 2026-08-07 and now
live in [`solana/decisions/`](../../foundation/solana/decisions/README.md) —
`0018` cluster selection and identity, `0019` registry-driven balance reads,
`0020` decimals verified against chain, `0021` address validity versus signing
capability. The entries below are the task-local record of how each was reached;
the decision files are what governs.

- 2026-08-07: **Split the package into a read phase and a write phase.** The read
  half has no dependency on item 3, so blocking the whole package on an undecided
  commitment policy stalls work that is ready. Amends the requirement record's
  status transition, which previously required item 3 before the package could
  exist at all.
- 2026-08-07: **Phase 2 stays gated on item 3.** The split relaxes when the package
  is created, not when the safety decision is made.
- 2026-08-07: **No allowance/approval surface.** Solana's token model has no
  spender approval to mirror; the EVM subtree is dropped rather than translated.
  The Solana package is therefore materially smaller than `@nln/web3-evm`, which
  is expected and not a sign of missing work.
- 2026-08-07: **`../interface` is a phase 1 reference only.** Recorded above with
  the reason: its confirmation path is delegated to Jupiter.
- 2026-08-07: **`@solana/web3.js` v1, not `@solana/kit` v2.** Not a default:
  `@solana/wallet-adapter-react@0.15.39` declares `@solana/web3.js: ^1.98.0` as a
  peer dependency, so v2 would mean dropping the wallet-adapter ecosystem the
  reference implementation and every Solana wallet rely on. Revisit when
  wallet-adapter supports v2.
- 2026-08-07: **No `SOLANA_NATIVE_TOKEN_ADDRESS` sentinel.** The EVM registry uses
  a sentinel address to mean "native asset". Native SOL is a lamport balance on
  the account itself, not an SPL mint, so a sentinel would be a fiction that
  invites treating it as a mint. Native reads are a separate call.
- 2026-08-07: **`isValidAddress` accepts PDAs; `isSignableAddress` is separate.**
  Program Derived Addresses are deliberately off-curve and are valid account
  addresses no keypair can sign for. Folding the two checks together would either
  reject every program-owned account the runtime must read, or let a PDA pass as
  a transfer recipient.
- 2026-08-07: **`SolanaSelection` has no `unsupported` state.** `EvmSelection`
  needs one because an EVM wallet holds its own `chainId` and can disagree with
  the application. A Solana wallet reports no cluster — it signs against whatever
  endpoint the application connected to — so the state cannot occur. The risk
  moves rather than disappearing: an endpoint labelled `devnet` may serve
  mainnet, which is why `assertSolanaClusterIdentity` compares genesis hashes.
- 2026-08-07: **`SOLANA_READ_COMMITMENT` is `confirmed`, and settles nothing
  about item 3.** A balance lagging 12-13 seconds reads as a bug; a stale balance
  self-corrects on the next poll. A write wrongly concluded successful does not.
  Recorded in the constant's own doc comment so it is not cited as precedent.
- 2026-08-07: **No per-wallet adapter packages.** `@solana/wallet-adapter-react`
  depends on `@solana/wallet-standard-wallet-adapter-react`, so Phantom, Solflare
  and Backpack register themselves. An explicit list would add a package per
  wallet and freeze the supported set at build time.
- 2026-08-07: **Measure commitment latency on devnet — proposed, not carried
  out.** The intent was to decide item 3 on our own timings rather than another
  product's published figures. It was overtaken: item 3 was accepted the same day
  on different grounds — the track record of a production application — so the
  measurement was never the deciding input. Recorded rather than deleted because
  a later reader comparing the accepted decision against this line would
  otherwise assume timings exist. They do not. If the `confirmed` choice is ever
  revisited, this measurement is still the cheapest way to ground it.

## Validation

- Focused proof: unit tests per module, mirroring the EVM package's test layout.
- Integration proof: devnet read smoke script showing a live SOL and SPL balance.
- Repository-required checks: `pnpm typecheck`, `pnpm lint`, `pnpm test:run`,
  `pnpm format:check`.

## Result

Pending.
