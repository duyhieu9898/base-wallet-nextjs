# 0007 Shared read logic

## Purpose

Service reads (Viem, ngoài React) và React hooks trả lời cùng một câu hỏi domain, nên phải dùng chung contract list, normalization và result mapping. Hai implementation song song sẽ dedupe khác nhau, sắp xếp khác nhau hoặc xử lý partial failure khác nhau, và một bug fix chỉ được áp dụng ở một bản sao.

## Decision

Pure builders và mappers dùng chung giữa Viem services và React hooks.

Balance:

```text
buildTokenBalanceContracts
mapTokenBalanceResults
```

Allowance:

```text
buildAllowanceContracts
mapAllowanceResults
```

## Required behavior

Builders và mappers:

- dedupe theo normalized address;
- giữ first-seen order;
- mapper kiểm tra số result khớp số request;
- mismatch ném `CONTRACT_READ_FAILED`;
- multicall dùng `allowFailure: true`;
- partial failures expose qua `hasPartialFailures` và `errors`.

Read policy chung cho mọi read hook:

- chỉ chạy khi selection hợp lệ;
- dùng registry metadata;
- dùng query keys thuộc Wagmi;
- dùng builder/mapper thuần khi có service tương ứng;
- hỗ trợ partial failure cho multicall;
- không biến read error thành value giả;
- phân biệt initial pending và background fetching khi UI cần.

## Boundaries

- Builders và mappers là pure functions: không RPC, không React state.
- Không copy contract-building logic vào từng hook.
- `allowFailure: false` không được dùng cho multicall balance/allowance reads: một token lỗi không được làm mất các kết quả đọc thành công.
- Caller xử lý `hasPartialFailures` thay vì nhận kết quả "tất cả hoặc không".

## Enforcement

- Pure adapter tests cho builders/mappers.
- Hook tests dùng chung adapter.
- Architecture boundary: adapter không phụ thuộc React.

## Code and tests

Implementation:

- `packages/web3-evm/src/reads/balances/evm-balance.adapter.ts`
- `packages/web3-evm/src/reads/allowances/evm-allowance.adapter.ts`
- `packages/web3-evm/src/reads/balances/evm-balance.service.ts`
- `packages/web3-evm/src/reads/allowances/evm-allowance.service.ts`
- `packages/web3-evm/src/reads/balances/use-evm-balances.ts`
- `packages/web3-evm/src/reads/allowances/use-evm-allowances.ts`

Tests:

- `packages/web3-evm/src/reads/balances/evm-balance.adapter.test.ts`
- `packages/web3-evm/src/reads/allowances/evm-allowance.adapter.test.ts`
- `packages/web3-evm/src/reads/balances/use-evm-balances.test.tsx`
- `packages/web3-evm/src/reads/allowances/use-evm-allowances.test.tsx`
