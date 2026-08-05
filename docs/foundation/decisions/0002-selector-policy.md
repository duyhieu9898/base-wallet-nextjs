# 0002 Selector policy: find vs get

## Purpose

Một số registry lookup có thể hợp lệ khi không có kết quả, ví dụ token chưa được cấu hình cho một chain. Một số lookup khác biểu thị invariant bắt buộc, ví dụ chain đang selected phải nằm trong registry. Tên selector phải truyền đạt sự khác biệt đó.

## Decision

```text
findEvm*
→ nullable result; "không tìm thấy" là trạng thái hợp lệ

getEvm*
→ result bắt buộc; ném typed EvmWeb3Error khi invariant bị vi phạm
```

## Required behavior

- `getEvm*` không bao giờ trả `null`.
- Required network lookup ném `NETWORK_NOT_FOUND` khi chain không nằm trong registry.
- Caller không thêm silent fallback cho kết quả của `getEvm*`.
- Selector mới chọn đúng prefix ngay từ đầu; đổi prefix là breaking change cho caller.

## Boundaries

- Không dùng naming tùy ý làm mờ missing-result semantics.
- Nullable-everywhere hoặc throw-everywhere đều không được dùng: cả hai đều xóa thông tin mà tên selector phải mang.

## Enforcement

- Type system: nullable vs non-nullable return type.
- Typed `EvmWeb3Error` codes.
- Registry adapter tests.
- Review policy khi thêm selector.

## Code and tests

Implementation:

- `src/web3/evm/chain/registry/evm-registry.adapter.ts`
- `src/web3/evm/chain/registry/evm-network.registry.ts`
- `src/web3/evm/chain/registry/registry.selectors.ts`
- `src/web3/evm/errors/evm-errors.ts`

Tests:

- `src/web3/evm/chain/registry/evm-registry.adapter.test.ts`
