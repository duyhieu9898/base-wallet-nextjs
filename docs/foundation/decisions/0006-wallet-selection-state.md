# 0006 Wallet selection state

## Purpose

Các boolean rời rạc như `isConnected`, `isConnecting`, `isSupported` cho phép tổ hợp vô nghĩa và buộc mỗi hook tự diễn giải readiness. Read và write boundary cần một nguồn duy nhất để quyết định khi nào được phép chạm RPC.

## Decision

`useEvmSelection()` là nguồn duy nhất cho wallet/network selection và trả đúng một trong bốn trạng thái:

```text
disconnected
connecting
ready
unsupported
```

| Status         | Account   | Chain                    | On-chain read | Write |
| -------------- | --------- | ------------------------ | ------------- | ----- |
| `disconnected` | `null`    | default catalog chain    | Không         | Không |
| `connecting`   | Có thể có | Chưa xác định            | Không         | Không |
| `ready`        | Có        | Supported wallet chain   | Có            | Có    |
| `unsupported`  | Có thể có | Unsupported wallet chain | Không         | Không |

## Required behavior

- Default chain khi `disconnected` chỉ phục vụ render catalog, không dùng để âm thầm thực hiện RPC cho wallet chưa kết nối.
- `connecting` không fallback sang default network.
- `unsupported` giữ `walletChainId` thật để UI giải thích và đề nghị switch, thay vì hiển thị fallback giả.
- Mọi read hook gate RPC bằng `selection.status === "ready"`.
- Mọi write boundary gọi `assertEvmWriteReady(selection)`.

## Boundaries

- Hooks nhận selection thay vì tự đọc `useAccount()` để suy selection riêng.
- Write hooks không tự fallback chain.
- Selection model này là EVM-specific; một chain family khác khai báo selection model riêng.
- Foundation hiện có một active EVM selection context cho mỗi provider tree.
- Nhiều EVM networks trong registry không đồng nghĩa với nhiều active wallet contexts đồng thời.
- Concurrent EVM contexts chỉ được thêm khi application requirement thật chứng minh nhu cầu; không phải baseline capability.

## Enforcement

- Type system: discriminated union cho selection status.
- `assertEvmWriteReady` tại mọi public write boundary.
- Selection tests.
- Hook tests kiểm tra reset khi selection thay đổi.

## Code and tests

Implementation:

- `src/web3/evm/selection/evm-selection.ts`
- `src/web3/evm/selection/use-evm-selection.ts`
- `src/web3/evm/selection/assert-evm-write-ready.ts`
- `src/web3/evm/hooks/use-evm-wallet.ts`

Tests:

- `src/web3/evm/selection/evm-selection.test.ts`
- `src/web3/evm/selection/assert-evm-write-ready.test.ts`
