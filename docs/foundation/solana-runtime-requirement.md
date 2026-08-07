# Solana Runtime Requirement Record

This record exists because `CHAIN_FAMILY_TEMPLATE.md` requires it: an approved
application requirement must be written down **before** any code is written for a
new chain family. Without it, `@nln/web3-solana` is not authorised to start, and
`CAPABILITIES.md` cannot list Solana above `Deferred`.

Status: **approved requirement, implementation not started.** Solana is
`Planned` in [`CAPABILITIES.md`](CAPABILITIES.md).

## Application requirement

The Neura System — `apps/neura` (product) and `apps/neura-admin` (operator
console) — is a Solana staking platform. EVM cannot serve it: the product is
specified against SPL tokens, program-derived vaults and Solana transaction
semantics, not against ERC-20 contracts.

Source specification: `docs/local-docs/NLN-181_project1-neura/02_docs/01_requirement/`.
Product scope summary: [`../product/nln-feature-source-map.md`](../product/nln-feature-source-map.md) §1.3.

Shape of what the runtime must support, from the specification:

- multiple independent pools, each with its own stake token, reward token, stake
  vault and reward vault;
- one position per stake action — positions are never merged, topped up or
  transferred;
- stake, unstake (partial or full), claim and compound as user-initiated
  transactions;
- no on-chain scheduling. Solana has no on-chain cron, so every reward action is
  an explicit user transaction. The runtime must never present a pending reward
  as automatically settled.

## The seven pre-code decisions

`CHAIN_FAMILY_TEMPLATE.md` §"Before writing code" requires all seven. Items
marked **OPEN** are not yet decided; each one must be closed before the code it
governs is written, and this record updated in the same change.

### 1. Supported networks and wallet connectors

- **OPEN** — network. Devnet for development is assumed; the production cluster
  is a customer decision and must not be hardcoded into the package, exactly as
  the EVM runtime does not hardcode its production chain.
- **OPEN** — wallet connector. The specification requires connect, disconnect,
  ownership proof by signature and session persistence, but names no wallet or
  adapter library.

### 2. Account/identity model and authentication

Decided by the specification:

- the wallet address is the identity; there is no password;
- ownership is proven by wallet signature, and a login session is bound to the
  verified wallet address;
- admin access is granted by the connected wallet matching the admin address in
  Global Config — connecting any other wallet is refused.

This mirrors the EVM application's SIWE shape but is **not** SIWE and must not
reuse `features/auth` from an EVM application. Message format and session
transport are application concerns, not runtime concerns.

- **OPEN** — the signed-message format and its replay protection.

### 3. Read, write, preflight and confirmation semantics

- **OPEN and blocking.** This is the item the family cannot start without,
  because it defines the runtime's terminal evidence.

`../ARCHITECTURE.md` §6 requires every family to define its own terminal
confirmation evidence and forbids concluding success without it. EVM's answer is
receipt status; Solana's answer is not receipt status and must be stated
explicitly — which commitment level counts as terminal, how a dropped or expired
blockhash is represented, and what a signature alone does and does not prove.

Until this is written, feature obligations 1, 2, 6 and 8 of
`FEATURE_MODULE_CONTRACT.md` §5 have no Solana mechanism to point at.

### 4. RPC provider, rate limit and failure policy

- **OPEN.** The same six unanswered questions that keep RPC health deferred for
  EVM apply here (`CAPABILITIES.md`, "RPC health và fallback"): provider
  ownership, failover policy, retry budget, rate-limit semantics, observability,
  consistency requirements.

### 5. Asset metadata source and validation

Decided by the specification:

- assets are **standard SPL tokens**; Token-2022 is explicitly not supported;
- decimals ≤ 18, and stake token decimals may differ from reward token decimals.

The decimals mismatch is a correctness requirement, not a display concern: the
specification records that skipping the decimal conversion underpays rewards by
a factor of 1,000 with no error raised. Registry validation must enforce declared
decimals against on-chain metadata, as the EVM registry does for ERC-20.

- **OPEN** — the metadata source of record and where the token registry lives.

### 6. Program ownership and deployment verification

- **OPEN.** Program IDs, IDL ownership and per-cluster deployment records. Per
  decision `0016` the deployment registry belongs to the application and the
  interface belongs to the feature that uses it — the package owns neither.

### 7. Test network, live-read smoke and safe write verification

- **OPEN.** The Solana equivalents of the four proof boundaries in decision
  `0010`. The layering is family-neutral and already applies; only the scripts
  and the test cluster are undecided.

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
  corresponding semantics are actually implemented.
- Solana does not need i18n, toast, reusable components or a dev harness to count
  as a runtime. Definition of done is in `CHAIN_FAMILY_TEMPLATE.md` and lists none
  of those.

## Status transitions

| From          | To            | Trigger                                              |
| ------------- | ------------- | ---------------------------------------------------- |
| `Deferred`    | `Planned`     | This record — done                                   |
| `Planned`     | `In Progress` | `packages/web3-solana/` exists and code has started  |
| `In Progress` | `Ready`       | `CHAIN_FAMILY_TEMPLATE.md` definition of done is met |

Item 3 must be closed before the transition to `In Progress`. The other OPEN
items must be closed before the code each one governs is written, not
necessarily before the package is created.
