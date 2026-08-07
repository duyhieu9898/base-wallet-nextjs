# EVM Adoption Guide

Use this repository as a starting point for a Next.js **EVM** dApp. It is a
reference foundation and demo, not a production application or a promise that
every included module belongs in the resulting product.

This guide covers one runtime. It is not the foundation's adoption policy — that
is family-neutral and lives in
[`../EXTENSION_CONTRACT.md`](../EXTENSION_CONTRACT.md) §1.1. An application on a
different chain family follows its own family's guide instead.

## Start from the runtime

Keep the EVM registry, wallet selection, read/write guards, transaction
lifecycle, typed errors, and provider composition when the new application uses
EVM.

Before adding product features:

1. Choose supported EVM networks and the default chain.
2. Configure environment-specific RPC URLs and replace sample token metadata.
3. Run `pnpm web3:smoke -- --chainId <chainId>` for every adopted network.
4. Add feature contract addresses and ABIs in the feature that owns them.
5. Decide authentication, backend/API ownership, and product permissions
   outside the Web3 runtime.

Changing an EVM network is configuration work. Do not rewrite wallet selection,
write guards, receipt evidence, or transaction lifecycle merely because a
customer changes from one EVM network to another.

## Reference modules

The following are intentionally included as copyable examples. Review and keep
only the modules that the application needs:

| Module                                                       | Role when adopting                                                                                                       |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `apps/n-plus/src/features/auth/`                             | EVM EOA SIWE + MSW reference. It is not a production backend, RBAC model, or multi-wallet auth solution.                 |
| `apps/n-plus/src/features/staking/` and `contracts/`         | A small feature and contract fixture showing feature-local ownership. Replace it with the product contract or remove it. |
| `apps/n-plus/src/app/web3-lab/` và `components/web3/`        | Development composition and reusable EVM UI examples. Keep, trim, or remove them deliberately.                           |
| Local transaction history and fee/review UI                  | Optional EVM modules. They do not replace an indexer or backend audit trail.                                             |
| Transaction feedback UI                                      | Optional ephemeral UI. It mirrors the write lifecycle but never replaces receipt tracking or local transaction history.  |
| [`../CHAIN_FAMILY_TEMPLATE.md`](../CHAIN_FAMILY_TEMPLATE.md) | Documentation for a future chain family only; it is not a runtime or SDK integration.                                    |

## Adding a real feature

Start feature-specific behavior under `apps/<app>/src/features/<feature>/`. Own its
contract addresses, ABI, business rules, UI, and tests there. Reuse EVM hooks
and domain components without bypassing write readiness, simulation, review,
receipt evidence, or cache invalidation.

Do not promote feature code into `packages/web3-evm/` until at least two real consumers
share the same semantics and invariant.

## Baseline proof

The GitLab pipeline runs the same repository quality gates in separate jobs:
format, typecheck, lint, tests, and build. Locally run:

```bash
pnpm check
pnpm format:check
```

`pnpm check` does not prove an RPC or deployment. Run the live read smoke after
network configuration. The optional local Sepolia write script is documented in
[`../../TESTNET_FUNDS.md`](../../TESTNET_FUNDS.md); it requires test funds and
must never run in CI.
