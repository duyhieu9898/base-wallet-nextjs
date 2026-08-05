# 0012 Local transaction history

## Purpose

Transaction đã broadcast phải tiếp tục được theo dõi kể cả khi UI rerender, account/chain thay đổi, receipt query tạm lỗi, page reload hoặc nhiều tab cùng mở.

Storage là side effect phụ, không phải source of truth cho transaction success.

## Decision

Storage key:

```text
base-wallet:evm-transactions:v1
```

Storage adapter:

```text
storage/evm-transaction-history.storage.ts
```

Hook:

```text
hooks/use-evm-transaction-history.ts
```

## Required behavior

Storage adapter:

- runtime validate item schema;
- dedupe theo `chainId + hash`;
- giới hạn tối đa 50 items;
- cô lập local storage exceptions.

Hook:

- expose React state;
- filter theo account/chain;
- đồng bộ cùng tab;
- đồng bộ cross-tab;
- không làm write flow phụ thuộc storage availability.

Write hooks lưu pending item từ immutable submission snapshot ngay khi nhận hash.

Pending receipt reconciler:

- tiếp tục theo dõi pending history;
- cập nhật success/reverted khi receipt có bằng chứng;
- hoạt động độc lập với local form tracking.

Ngoài ra:

- storage failure không làm submission thất bại, nên có trường hợp transaction gửi thành công nhưng không xuất hiện trong history;
- `stopTrackingReceipt` không xóa pending history;
- thay đổi item schema phải tăng version trong storage key.

## Boundaries

- Local storage không phải chain source of truth: chỉ receipt on-chain chứng minh terminal status.
- History không thay thế receipt; reconciler chạy nền để cập nhật status.
- History không giữ trong React state của form và không phình vô hạn.

## Enforcement

- Runtime validation trong storage adapter.
- `try/catch` cô lập storage exceptions khỏi write path.
- Storage schema tests.
- Hook tests cho persistence isolation và cross-tab sync.

## Code and tests

Implementation:

- `src/web3/evm/transactions/history/evm-transaction-history.storage.ts`
- `src/web3/evm/transactions/history/evm-transaction-history.ts`
- `src/web3/evm/transactions/history/use-evm-transaction-history.ts`
- `src/web3/evm/transactions/history/pending-receipt-reconciler.tsx`
- `src/web3/evm/components/history/recent-transactions-card.tsx`

Tests:

- `src/web3/evm/transactions/history/evm-transaction-history.storage.test.ts`
- `src/web3/evm/transactions/history/use-evm-transaction-history.test.tsx`
