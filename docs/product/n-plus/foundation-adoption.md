# Foundation Adoption — `apps/n-plus`

Application: `n-plus` (N+ System product application).

Foundation: `base-wallet-nextjs`, maintained in this repository.

Foundation version: the application and foundation share the same Git commit.

The admin application has its own record:
[`../n-plus-admin/foundation-adoption.md`](../n-plus-admin/foundation-adoption.md).

## Adopted runtime

- `@nln/web3-evm`. Full runtime: provider, wallet connection, reads and writes.

## Supported networks and default network

- Ethereum Sepolia (`11155111`)
- Ethereum Mainnet (`1`)
- The default EVM chain comes from `NEXT_PUBLIC_DEFAULT_CHAIN_ID`; it falls back
  to Sepolia when unset. The selected value must exist in the EVM registry.

## Adopted capabilities

- Wallet connection and EVM network selection.
- Native and ERC-20 asset reads from the EVM registry.
- EVM transaction preparation, review, submission, receipt tracking, and cache
  invalidation.
- Application-level SIWE authentication, composed outside `Web3Providers`.

## Application restrictions

- Authentication uses EVM EOA signatures through SIWE; EIP-1271 contract-wallet
  verification is not supported.
- The current auth backend is an MSW-backed development contract, not a
  production backend or persistence implementation.
- An authenticated wallet must match the backend session address before a
  protected mutation can run.

## Local extensions

- `apps/n-plus/src/features/auth/` owns session state, retry rules, and the wallet-binding
  guard.
- `apps/n-plus/src/app/providers.tsx` composes auth around the reusable Web3 provider;
  `packages/web3-evm` must not import application auth.

## Known deviations

None. Application code uses the foundation’s documented public boundaries and
does not change foundation safety invariants.
