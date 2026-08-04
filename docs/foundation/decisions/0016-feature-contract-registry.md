# 0016 Feature contract registry

## Purpose

Feature contracts need a single source of truth for supported-chain deployment
metadata without leaking contract addresses and ABI choices into UI components
or feature hooks.

## Decision

Foundation does not implement a feature contract registry yet.

A registry is introduced only with the first implemented feature contract that
has a real consumer, ABI and deployment address on at least one supported EVM
chain. The first registry entry is feature-scoped, for example staking, rather
than a speculative application-wide map of unknown future contracts.

## Required behavior

- A registry entry identifies the feature key, chain ID, deployed contract
  address and ABI/version required by that feature.
- Feature hooks resolve deployment metadata from the registry; they do not
  hardcode contract addresses in components or hook bodies.
- An unsupported or undeployed chain produces an explicit typed unavailable
  result or error. It must not fall back to another chain's address.
- Runtime configuration and deployment metadata are validated at their input
  boundary.
- A registry entry includes only metadata with a current consumer. Product
  policy, form state and transaction orchestration remain feature-owned.

## Boundaries

- No empty registry, sample addresses or placeholder ABI is committed before a
  feature contract exists.
- Foundation does not declare the production network, feature contract set or
  deployment lifecycle for an application.
- The generic EVM network/token registry does not become a container for
  application feature contracts.
- A feature must not bypass the registry after it exists by embedding an
  address in UI, test fixture shared with production code, or a write hook.

## Enforcement

- Registry schema and selectors are added with the first feature consumer.
- Feature hooks use typed selectors that distinguish configured from missing
  deployments.
- Tests cover supported deployment resolution, missing-chain behavior and
  runtime-invalid metadata.

## Code and tests

Implementation: not implemented.

Tests: not implemented.
