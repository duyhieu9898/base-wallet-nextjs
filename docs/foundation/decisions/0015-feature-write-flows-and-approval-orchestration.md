# 0015 Feature write flows and approval orchestration

## Purpose

Feature contracts such as staking, ERC-20 payments and NFT operations share
wallet readiness, balance/allowance checks and transaction lifecycle safety.
They must reuse those invariants without turning unrelated contract actions
into one generic transaction API.

## Decision

Foundation exposes reusable EVM primitives for selection, balances, allowances,
write lifecycle, error normalization, receipt tracking and targeted cache
invalidation.

Each product feature owns a domain hook, for example `useStake`, `useUnstake`,
`useSendUsdc` or `useSendNft`. A feature hook composes the primitives and owns
its contract ABI, request validation, simulation, review, history model and
domain cache invalidation.

`useApprovalRequirement` and `useApprovalThenWriteFlow` are not implemented.
They are considered only after at least two feature consumers demonstrate the
same approval preflight and two-step UX.

## Required behavior

- Every feature write checks EVM readiness through the shared selection guard.
- A feature validates its own balance, token registry and contract-specific
  preconditions before opening a wallet request.
- A feature determines whether approval is required from the spender and the
  required allowance; direct ERC-20 transfer and direct NFT transfer do not
  imply approval.
- Approval and the primary transaction are distinct user-authorized steps. The
  UI shows their reviews and wallet prompts separately.
- The primary transaction is unavailable until an approval receipt proves
  success. A submitted approval hash is not sufficient evidence.
- Every write retains the guarantees in `0008`: duplicate-submit protection,
  stale-operation isolation and receipt-evidence terminal status.
- A feature may use permit, Permit2 or another execution strategy only when its
  product contract explicitly supports it; it must not be treated as ERC-20
  approval.
- A feature write records its own history item and its own post-receipt
  invalidation. Refetching a domain read alone is not sufficient: a write that
  moves an asset also stales the wallet balance and, for ERC-20, the allowance.
- Asset symbols and decimals shown to the user come from the registry and the
  connected chain. A feature must not name or format an asset with a literal;
  contract function names such as `stakeUsdc` are the exception, since they are
  the deployed ABI rather than a presentation choice.

## Boundaries

- Foundation does not provide a `useTransaction` hook that accepts arbitrary
  ABI, function name, simulation, review and invalidation callbacks.
- Foundation does not automatically approve and then submit a primary action in
  one opaque user interaction.
- Feature hooks must not bypass registry validation, write readiness or receipt
  evidence rules.
- No approval orchestration abstraction is added for a single feature or merely
  speculative future flows.
- Multi-step product UX, contract addresses, spender policy and amount policy
  belong to the feature/application layer.

## Enforcement

- `useEvmWriteLifecycle` owns shared mechanical write safety.
- `assertEvmWriteReady` guards connected supported-wallet writes.
- Registry and allowance primitives validate token and spender boundaries.
- Feature implementations add focused tests for their own preflight and
  approval-to-primary receipt transition. Wallet-prompt end-to-end coverage is
  added when a product flow requires it.

## Code and tests

Implementation:

- `packages/web3-evm/src/transactions/lifecycle/use-evm-write-lifecycle.ts`
- `packages/web3-evm/src/reads/allowances/use-evm-allowance.ts`
- `packages/web3-evm/src/reads/allowances/use-evm-allowances.ts`
- `packages/web3-evm/src/chain/selection/assert-evm-write-ready.ts`

Tests:

- `packages/web3-evm/src/transactions/native-transfer/use-send-evm-native.test.tsx`
- `packages/web3-evm/src/transactions/erc20-transfer/use-send-evm-token.test.tsx`
- `packages/web3-evm/src/transactions/erc20-approval/use-approve-evm-token.test.tsx`

Feature side, carrying the guarantee ESLint cannot express:

- `src/features/staking/hooks/use-staking-write.test.tsx` — preflight, duplicate
  submit, stale operation, receipt evidence, once-per-hash callback.
- `src/features/staking/components/staking-approval-panel.test.tsx` — the
  approval step stays recoverable after a reverted or unreachable receipt.
- `src/features/staking/components/staking-action-panel.test.tsx` — the signed
  transaction is named from the prepared write and the registry, not a literal.
