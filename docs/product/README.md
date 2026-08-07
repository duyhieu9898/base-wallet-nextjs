# Product Docs

This directory contains current consumer-product behavior derived from real
accepted intent. Harness deliberately ships no fake product domains.

When a user provides a product specification, derive smaller living documents
here instead of keeping one growing specification as the operating manual. Name
files after actual product domains, such as `overview.md`, `billing.md`,
`permissions.md`, or `api-conventions.md`.

## Current Project Contract

- [`nln-feature-source-map.md`](nln-feature-source-map.md): a non-authoritative
  inventory of local feature-source material awaiting product review.
- [`../decisions/auth-session-transport.md`](../decisions/auth-session-transport.md):
  the current SIWE authentication and session contract.

### Foundation adoption records

One record per application — not one per product system, and not one shared
record. Two applications adopting the same runtime still differ in networks,
restrictions and deviations.

- [`n-plus/foundation-adoption.md`](n-plus/foundation-adoption.md) — product app, EVM.
- [`n-plus-admin/foundation-adoption.md`](n-plus-admin/foundation-adoption.md) — admin app, EVM, read-only surface.
- `neura/`, `neura-admin/`, `neura-link/`, `neura-link-admin/` — written when each
  app is scaffolded. Do not pre-create them with invented values.

The application ↔ runtime summary table lives in
[`../ARCHITECTURE.md`](../ARCHITECTURE.md) §2. These records hold the detail.

Add feature-specific product documents here when a feature introduces durable
user-visible behavior that is not already owned by one of those documents.

## Update Rule

When behavior changes:

1. Update the affected product document when the expected behavior changed.
2. Update the active execution plan when complex work uses one.
3. Add a lasting decision only when future work must inherit a consequential
   product, architecture, data, security, compatibility, or validation choice.
4. Add or update executable proof that exercises the behavior.

Bounded changes do not require a story packet, proof-matrix row, or Harness CLI
mutation.
