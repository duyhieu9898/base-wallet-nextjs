# 0017 Error normalization and observability

## Purpose

The application needs truthful, domain-specific errors for UI and control flow,
and a future-safe path to local diagnostics or external observability without
leaking credentials, signatures or raw provider payloads.

## Decision

Errors remain domain-specific:

- `ApiError` represents HTTP transport and response metadata.
- `AuthError` represents authentication and wallet-signing outcomes.
- `EvmWeb3Error` represents EVM reads, writes and transaction lifecycle.

Each boundary maps unknown external errors to its domain error type while
preserving the original value in `cause`. Application code does not replace a
known typed error with a generic `Error`.

There is no global reporter, error boundary or Sentry integration yet. Local
debugging uses the typed error and its `cause` in the debugger. A reporter is
added only with a production observability requirement.

## Required behavior

- A boundary preserves an existing domain error of its own type.
- API, wallet, RPC and schema boundaries normalize unknown failures before
  exposing them to UI state.
- User-visible messages are concise and do not expose raw request bodies,
  access tokens, refresh tokens, signatures, RPC payloads or backend details.
- Error handling does not silently catch and discard a failed primary operation.
  Fire-and-forget, best-effort side effects may be isolated only when their
  failure cannot change the transaction or session outcome.
- Code throws a typed domain error when a defined error taxonomy applies;
  generic `Error` is reserved for configuration/programming failures without a
  domain contract.

## Boundaries

- `AuthError` and `EvmWeb3Error` are not merged into one broad application
  error union. Their codes drive different safety and UI behavior.
- UI does not display `cause`, raw `ApiError.details`, or raw Viem/Wagmi error
  messages.
- Foundation does not report errors to a vendor, send browser-global errors or
  add a catch-all error boundary before a product requirement exists.
- A future reporter must receive a redacted event envelope, not arbitrary raw
  error objects or request/response data.

## Enforcement

- `toEvmWeb3Error`, Auth error mappers and `ApiError` are the current external
  error boundaries.
- Focused mapper tests preserve error codes, phase semantics and sanitization.
- Code review rejects `catch {}` around primary operations and generic error
  wrapping that discards a known typed error.
- When observability is added, it defines a `reportError` boundary with an
  allowlisted context schema and an explicit redaction policy before a vendor
  adapter is introduced.

## Code and tests

Implementation:

- `src/lib/api/api-error.ts`
- `src/features/auth/domain/auth-error.ts`
- `src/web3/evm/errors.ts`
- `src/web3/evm/adapters/evm-error.adapter.ts`

Tests:

- `src/features/auth/domain/auth-error.test.ts`
- `src/web3/evm/adapters/evm-error.adapter.test.ts`
