# 0008 Write hooks and transaction lifecycle

## Purpose

Write flows cần thống nhất API, simulation, lifecycle, reset semantics và stale-operation safety.

Async wallet flows chứa race condition không giải quyết được chỉ bằng React state: wallet trả hash trước khi React commit, người dùng đổi account/chain giữa chừng, hoặc cùng một request bị submit hai lần.

## Decision

Decision này sở hữu async write lifecycle sau khi public readiness boundary đã được kiểm tra. Readiness mapping thuộc `0005`; review UX thuộc `0011`.

### Public API

```text
useSendEvmNative({ onReceiptSuccess? })
useSendEvmToken({ tokenAddress?, onReceiptSuccess? })
useApproveEvmToken({
  tokenAddress?,
  spenderAddress?,
  onReceiptSuccess?
})
```

Write hooks expose tương đương:

```text
status
hash
error
reset
```

cùng các feature-specific fields như review, prepare, confirm, fee estimate hoặc stop tracking.

### Lifecycle

```text
idle
  ↓ prepare
simulating
  ↓ simulation success
ready
  ↓ confirm
awaiting-signature
  ↓ wallet returns hash
confirming
  ↓ receipt
success | reverted
```

Các nhánh terminal hoặc recoverable khác:

```text
rejected
error
```

| Status               | Ý nghĩa                                     |
| -------------------- | ------------------------------------------- |
| `idle`               | Chưa có prepared request                    |
| `simulating`         | Đang simulate contract call                 |
| `ready`              | Prepared request hợp lệ và sẵn sàng confirm |
| `awaiting-signature` | Wallet request đang mở                      |
| `confirming`         | Đã có hash, đang chờ receipt                |
| `success`            | Receipt xác nhận thành công                 |
| `reverted`           | Receipt xác nhận execution reverted         |
| `rejected`           | Người dùng từ chối trong wallet             |
| `error`              | Simulation, submission, RPC hoặc lỗi khác   |

## Required behavior

### Simulation

Contract simulation truyền connected wallet `account` để `msg.sender` khớp submission thật.

### Evidence rules

- `SIMULATION_REVERTED` → `error`.
- Contract execution error trong submission trước khi có hash → `TRANSACTION_FAILED` → `error`.
- Có hash nhưng chưa có terminal receipt → `confirming`, trừ khi đang có một error cần hiển thị.
- Chỉ `receiptStatus === "reverted"` → `reverted`.
- Chỉ `receiptStatus === "success"` → `success`.
- Error code một mình không đủ để chứng minh terminal on-chain status.
- Hash không thay thế receipt.

Receipt reverted tạo typed `TRANSACTION_REVERTED` để terminal reverted state luôn có error object.

### Duplicate-submit guards

- `submissionInFlightRef` bảo vệ khoảng thời gian wallet request chưa resolve/reject.
- `submittedHashRef` bảo vệ synchronous window sau khi wallet trả hash nhưng trước React state commit.
- `submittedHashRef` phải được set trước khi release `submissionInFlightRef`.

### Operation ownership

Mỗi confirm operation có identity gồm:

- operation ID;
- selection key tại thời điểm submission.

Chỉ current operation được phép sửa:

- `submissionInFlightRef`;
- `submittedHashRef`;
- `hash`;
- `submissionError`.

Stale operation:

- vẫn trả result/error cho original caller;
- vẫn lưu pending history từ immutable submission snapshot nếu có hash;
- không clear hoặc overwrite guard/state của operation mới.

### Receipt tracking escape

`stopTrackingReceipt()`:

- chỉ là thao tác phía client;
- không cancel transaction on-chain;
- không replace transaction;
- không thay đổi nonce;
- không xóa pending history;
- chỉ giải phóng local write state khi receipt tracking gặp RPC error;
- cho phép pending reconciler tiếp tục theo dõi item đã lưu.

UI phải diễn đạt rõ rằng transaction vẫn có thể confirm on-chain.

## Boundaries

- `useEvmWriteLifecycle` owns only shared mechanical safety: selection-change reset, synchronous duplicate-submit guards, operation ownership and once-per-hash receipt handling. Simulation target, review model, history item and cache invalidation remain in each domain hook.
- React state một mình không được dùng làm synchronous duplicate-submit guard; state commit là bất đồng bộ.
- Error code không chứng minh terminal status.
- Nonce replacement/cancel không thuộc baseline (xem `CAPABILITIES.md`).
- Write hook mới tái sử dụng lifecycle derivation và guard pattern hiện có.

## Enforcement

- Type system: `EvmWriteStatus`.
- Pure lifecycle derivation tách khỏi hook.
- Ba hook test suites cho duplicate submission, stale operation ownership và receipt callbacks.

## Code and tests

Implementation:

- `packages/web3-evm/src/transactions/lifecycle/evm-write-status.ts`
- `packages/web3-evm/src/transactions/native-transfer/use-send-evm-native.ts`
- `packages/web3-evm/src/transactions/erc20-transfer/use-send-evm-token.ts`
- `packages/web3-evm/src/transactions/erc20-approval/use-approve-evm-token.ts`
- `packages/web3-evm/src/transactions/receipt/use-evm-transaction-receipt.ts`
- `packages/web3-evm/src/transactions/{native-transfer,erc20-transfer,erc20-approval}/prepare.ts`

Tests:

- `packages/web3-evm/src/transactions/lifecycle/evm-write-status.test.ts`
- `packages/web3-evm/src/transactions/{native-transfer,erc20-transfer,erc20-approval}/prepare.test.ts`
- `packages/web3-evm/src/transactions/native-transfer/use-send-evm-native.test.tsx`
- `packages/web3-evm/src/transactions/erc20-transfer/use-send-evm-token.test.tsx`
- `packages/web3-evm/src/transactions/erc20-approval/use-approve-evm-token.test.tsx`
