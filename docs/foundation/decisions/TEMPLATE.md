# NNNN Decision title

## Purpose

Decision này bảo vệ vấn đề hoặc invariant nào?

Viết ngắn, chỉ cung cấp context cần thiết để hiểu rule hiện tại.

## Decision

Foundation áp dụng rule nào?

Ghi rõ public API, ownership hoặc state model khi có.

## Required behavior

- Behavior bắt buộc.
- Edge case bắt buộc.
- Evidence hoặc precedence rule.
- Behavior mà implementation mới phải giữ.

## Boundaries

- Điều foundation không làm.
- Điều UI, feature hoặc application không được bypass.
- Điều thuộc application hoặc feature layer.
- Deferred capability liên quan, nếu cần.

## Enforcement

- Type hoặc schema.
- Runtime guard.
- Architecture boundary.
- Focused tests.
- Validation command hoặc review rule.

## Code and tests

Implementation:

- `src/...`

Tests:

- `src/...test.ts`
