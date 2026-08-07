# Foundation Adoption — `apps/n-plus-admin`

Application: `n-plus-admin` (N+ System operator console).

Foundation: `base-wallet-nextjs`, maintained in this repository.

Foundation version: the application and foundation share the same Git commit.

The product application has its own record:
[`../n-plus/foundation-adoption.md`](../n-plus/foundation-adoption.md). The two
adopt the same runtime at different depths, which is why they are separate
records.

## Adopted runtime

- `@nln/web3-evm`, **pure leaves only**.

The application declares `@nln/web3-evm` and `viem`, and deliberately declares
neither `wagmi` nor `@tanstack/react-query`. It consumes:

```text
@nln/web3-evm/address    address validation and truncation for display
@nln/web3-evm/registry   explorer URL and network lookup
@nln/web3-evm/config     runtime configuration construction
```

It does not mount `EvmProvider`, does not connect a wallet, and does not submit
transactions. This is the shape the pure leaves exist for — a read-only operator
surface must not be forced to pull the whole EVM runtime into its module graph
(`foundation/evm/EXTENSION_CONTRACT.md` §1).

## Supported networks and default network

Inherited from the shared registry configuration; the console renders explorer
links for whichever chain a record belongs to. It does not select or switch a
network, because it never holds a wallet connection.

## Adopted capabilities

- Address presentation and validation.
- Explorer transaction/address link construction.
- Registry network lookup.

Not adopted: wallet connection, network selection state, balance and allowance
reads, transaction preparation, review, submission, receipt tracking, cache
invalidation, local transaction history.

## Application restrictions

- Admin authorization is RBAC composed at the application level, not SIWE. It is
  not shared with the product application's auth feature.
- The console performs no on-chain writes. Any future operator write flow is a
  runtime-depth change and must update this record before it is built.

## Local extensions

- `apps/n-plus-admin/src/components/web3/explorer-link.tsx` — presentation over
  the pure leaves, application-owned per decision `0014`.
- `apps/n-plus-admin/src/config/web3.config.ts` — application-owned runtime
  configuration.

## Known deviations

None. The application consumes only documented public leaves and adds no
foundation modification.
