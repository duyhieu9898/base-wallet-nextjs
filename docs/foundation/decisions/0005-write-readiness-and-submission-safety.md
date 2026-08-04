# 0005 Write readiness and submission safety

## Purpose

Nếu mỗi hook tự suy luận readiness, native transfer, token transfer và approval sẽ dần lệch nhau về điều kiện cho phép và thông báo lỗi; bug safety chỉ xuất hiện ở một hook.

Safety policy không được phụ thuộc vào việc một UI cụ thể có disable button hay không: form mới, keyboard shortcut và programmatic call đều bypass được UI.

## Decision

- Mọi public `prepare`, `confirmSend` và `confirmApprove` gọi `assertEvmWriteReady(selection)`.
- Không expose public `send()` bypass review.
- Active submission được bảo vệ bằng synchronous refs cùng current hash/receipt state.
- Token write yêu cầu token tồn tại trong registry.
- Mainnet và testnet đều được phép write nếu chain nằm trong supported registry.

Mapping selection:

| Selection      | Result                |
| -------------- | --------------------- |
| `ready`        | Cho phép              |
| `unsupported`  | `UNSUPPORTED_CHAIN`   |
| `disconnected` | `SELECTION_NOT_READY` |
| `connecting`   | `SELECTION_NOT_READY` |

## Required behavior

Prepare và reset bị chặn khi:

- wallet request đang mở;
- transaction đang ở non-terminal receipt tracking.

Reset được phép sau terminal receipt. Receipt RPC error có escape path riêng qua `stopTrackingReceipt`.

Public write boundary phải:

1. Gọi `assertEvmWriteReady`.
2. Không expose low-level send shortcut bypass review.
3. Không cho prepare hoặc reset đè lên active wallet request.
4. Không submit khi prepared request chưa sẵn sàng.
5. Delegate lifecycle, operation ownership và receipt evidence cho rule trong `0008`.
6. Delegate review UX và fee preview cho rule trong `0011`.

## Boundaries

- UI không tự suy readiness và không phải nơi enforce safety.
- Feature không gọi write core trực tiếp; mọi write đi qua public hook API và xử lý typed errors.
- Hạn chế chain theo product policy thuộc application layer (xem `EXTENSION_CONTRACT.md`); foundation guard không được nới lỏng để đổi lấy shortcut.
- Async operation ownership và duplicate-submit guard thuộc [0008 Write hooks and transaction lifecycle](0008-write-hooks-and-transaction-lifecycle.md).
- Review flow thuộc [0011 Transaction review and fee preview](0011-transaction-review-and-fee-preview.md).

## Enforcement

- `assertEvmWriteReady` tại mọi public write boundary.
- Synchronous refs trong write hooks.
- Public API không export write shortcut.
- Hook tests cho duplicate submission và guard behavior.

## Code and tests

Implementation:

- `src/web3/evm/selection/assert-evm-write-ready.ts`
- `src/web3/evm/hooks/use-send-evm-native.ts`
- `src/web3/evm/hooks/use-send-evm-token.ts`
- `src/web3/evm/hooks/use-approve-evm-token.ts`

Tests:

- `src/web3/evm/selection/assert-evm-write-ready.test.ts`
- `src/web3/evm/hooks/use-send-evm-native.test.tsx`
- `src/web3/evm/hooks/use-send-evm-token.test.tsx`
- `src/web3/evm/hooks/use-approve-evm-token.test.tsx`
