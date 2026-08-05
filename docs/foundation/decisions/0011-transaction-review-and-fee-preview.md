# 0011 Transaction review and fee preview

## Purpose

Wallet UI hiển thị dữ liệu đã encode, không phải domain model mà người dùng vừa nhập. Mở wallet ngay khi submit form khiến người dùng không kiểm tra được recipient, amount, network, token, spender, fee và approval risk.

## Decision

Foundation-provided transaction forms dùng flow:

```text
Prepare → Review → Confirm
```

Flow này bắt buộc cho:

- native transfer;
- token transfer;
- token approval;
- user-configured contract calls được foundation cung cấp dưới dạng reusable form.

Không có public shortcut bypass review.

Pure review builders nằm trong `evm-transaction-review.adapter.ts`:

```text
buildNativeTransferReview
buildTokenTransferReview
buildTokenApprovalReview
```

## Required behavior

Khi `review !== null`:

- recipient/amount/spender inputs bị khóa;
- review được dựng từ prepared request và selection snapshot;
- confirm chỉ bật khi write request sẵn sàng;
- fee estimate không còn `idle` hoặc `estimating`.

Fee estimation:

- được quản lý bởi `useEvmFeeEstimate`;
- lỗi được map thành typed `feeEstimate.error`;
- fee error không làm write hook chuyển sang transaction error.

Warnings:

- mainnet warning dựa trên `!network.chain.testnet`;
- unlimited approval warning khi `rawAmount === maxUint256`.

## Boundaries

- UI không dựng review từ mutable form state sau prepare; muốn sửa input thì phải reset hoặc re-prepare.
- Fee preview là thông tin bổ trợ: lỗi ước lượng fee không có nghĩa là transaction không gửi được.
- Foundation transaction form mới thuộc phạm vi trên phải triển khai đủ prepare/review/confirm.
- Feature-specific writes có thể định nghĩa UX riêng qua application decision, nhưng không được bypass:
  - readiness guard;
  - contract simulation khi applicable;
  - typed errors;
  - duplicate-submit protection;
  - receipt-evidence lifecycle.
- Message signing hoặc authentication signatures không tự động thuộc transaction review flow này; chúng cần feature-specific contract.

## Enforcement

- Public write API không expose shortcut.
- Pure review builder tests.
- Fee estimate hook tách khỏi write error surface.
- Component composition tests.

## Code and tests

Implementation:

- `src/web3/evm/transactions/{native-transfer,erc20-transfer,erc20-approval}/review.ts`
- `src/web3/evm/transactions/review/evm-transaction-review.ts`
- `src/web3/evm/transactions/fees/use-evm-fee-estimate.ts`
- `src/web3/evm/transactions/fees/evm-fee-estimate.ts`
- `src/web3/evm/components/common/transaction-review-card.tsx`
- `src/web3/evm/components/forms/`

Tests:

- `src/web3/evm/transactions/{native-transfer,erc20-transfer,erc20-approval}/review.test.ts`
- `src/web3/evm/transactions/fees/use-evm-fee-estimate.test.tsx`
- `src/components/web3/web3-lab.test.tsx`
