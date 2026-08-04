# 0009 Cache ownership and invalidation

## Purpose

Mirror cùng một on-chain state sang nhiều cache/store tạo stale data và invalidation không nhất quán. Sau một write thành công, chỉ hook thực hiện write mới biết chính xác domain data nào đã thay đổi.

## Decision

### Ownership

Mỗi loại dữ liệu có đúng một chủ sở hữu.

| Dữ liệu                                     | Chủ sở hữu                                   |
| ------------------------------------------- | -------------------------------------------- |
| Balance, allowance, receipt trong React app | Wagmi Query Cache                            |
| Network và token metadata                   | Static registry                              |
| On-chain read ngoài React                   | Viem public client, không có app query cache |
| Non-Web3 server data                        | TanStack Query với feature query keys        |
| Recent local transactions                   | Versioned local storage adapter              |

### Invalidation

Invalidation thuộc write hook, không thuộc UI.

## Required behavior

Sau receipt success:

- native transfer invalidate native balance;
- token transfer invalidate token `balanceOf`;
- approval invalidate `allowance`.

Query keys dùng canonical builders từ `wagmi/query`, bao gồm:

- `getBalanceQueryKey`;
- `readContractQueryKey`.

Multicall invalidation dùng predicate theo:

- chain;
- normalized token address;
- function name;
- contract list.

Receipt-success callbacks và invalidations chỉ chạy một lần cho mỗi hash.

## Boundaries

- UI không tự invalidate và không cần hiểu cache internals hoặc query key shape.
- Không mirror cùng một on-chain state sang store khác nếu không có lý do đặc biệt.
- Không invalidate toàn bộ query cache sau mỗi write.
- Không dùng arbitrary string query key khi Wagmi cung cấp canonical key builder.

## Enforcement

- Invalidation adapter tách khỏi UI.
- Pure tests cho predicate matching.
- Hook tests xác nhận invalidation once-per-hash.

## Code and tests

Implementation:

- `src/web3/evm/adapters/evm-invalidation.adapter.ts`
- `src/web3/evm/hooks/use-send-evm-native.ts`
- `src/web3/evm/hooks/use-send-evm-token.ts`
- `src/web3/evm/hooks/use-approve-evm-token.ts`
- `src/providers/query-provider.tsx`

Tests:

- `src/web3/evm/adapters/evm-invalidation.adapter.test.ts`
- `src/web3/evm/hooks/use-send-evm-token.test.tsx`
- `src/web3/evm/hooks/use-approve-evm-token.test.tsx`
