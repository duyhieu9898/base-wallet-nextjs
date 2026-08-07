# 0016 Feature contract registry

## Purpose

Feature contracts need a single source of truth for supported-chain deployment
metadata without leaking contract addresses and ABI choices into UI components
or feature hooks.

## Decision

Foundation does not implement a contract registry. The application introduces
one central, application-owned registry only after the first implemented
feature contract has a real consumer, ABI and deployment address on at least
one supported EVM chain.

Contract registry schema and validation helpers live inside `@nln/web3-evm`, while application contract deployment data lives under `src/contracts/registry/deployments.json`. The registry is keyed by chain ID and contract key, owning generic deployment metadata: address, ABI key/version and immutable deployment parameters. Features retain their own business semantics and consume the registry through typed selectors.

## Required behavior

- A registry entry identifies the contract key, chain ID, deployed contract
  address and ABI/version required by that feature.
- Feature hooks resolve deployment metadata from the registry; they do not
  hardcode contract addresses in components or hook bodies.
- Every foundation-supported chain is explicitly present in config. An empty
  object means no application contract is deployed there. An unsupported or
  undeployed chain produces an explicit typed unavailable
  result or error. It must not fall back to another chain's address.
- Runtime configuration and deployment metadata are validated at their input
  boundary.
- A registry entry includes only metadata with a current consumer. Product
  policy, form state and transaction orchestration remain feature-owned.

## Boundaries

- No sample addresses or placeholder ABI is committed before a feature contract
  exists. Empty per-chain deployment maps are allowed only to state that a
  supported chain has no deployment yet.
- Foundation does not declare the production network, feature contract set or
  deployment lifecycle for an application.
- Generic EVM network/token registry does not become a container for
  application feature contracts.
- A feature must not bypass the registry after it exists by embedding an
  address in UI, test fixture shared with production code, or a write hook.

## Enforcement

- Generic deployment types and validation helpers are exported by foundation (@nln/web3-evm). Application-owned selectors resolve application contract keys and deployments.
- Feature hooks use typed selectors that distinguish configured from missing
  deployments.
- Tests cover supported deployment resolution, missing-chain behavior and
  runtime-invalid metadata.

## Code and tests

Implementation:

- `packages/web3-evm/src/contracts/`
- `src/contracts/registry/deployments.json`
- `src/contracts/registry/contract-registry.ts`

Tests:

- `src/contracts/registry/contract-registry.test.ts`
