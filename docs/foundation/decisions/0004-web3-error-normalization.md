# 0004 Web3 error normalization

## Purpose

Raw Viem/Wagmi errors không phải stable UI contract: chúng có nhiều lớp `cause`, message nhiều dòng, request details và error type thay đổi giữa các phiên bản thư viện.

Cùng một error type còn mang ý nghĩa khác nhau tùy phase. Một contract revert trong simulation không chứng minh transaction đã được mine và revert on-chain.

## Decision

Mọi Web3 error đi qua `EvmWeb3Error` với typed `EvmErrorCode`.

Generic mapping theo phase:

| Phase        | Generic code         |
| ------------ | -------------------- |
| `simulation` | `SIMULATION_FAILED`  |
| `submission` | `TRANSACTION_FAILED` |
| `receipt`    | `RPC_REQUEST_FAILED` |

Error code mô tả loại lỗi; lifecycle mô tả trạng thái đã quan sát được. Hai khái niệm không được trộn lẫn.

## Required behavior

Precedence khi normalize:

1. Existing `EvmWeb3Error` → giữ nguyên.
2. `UserRejectedRequestError` → `TRANSACTION_REJECTED`.
3. Nested `ContractFunctionRevertedError`:
   - simulation → `SIMULATION_REVERTED`;
   - submission → `TRANSACTION_FAILED`;
   - receipt → `TRANSACTION_REVERTED`.
4. `InsufficientFundsError` → `INSUFFICIENT_FUNDS`.
5. `ChainMismatchError` → `CHAIN_MISMATCH`.
6. Nonce-too-low/replacement-underpriced → `NONCE_TOO_LOW`.
7. Generic phase mapping.

Contract revert message ưu tiên:

1. revert reason;
2. custom error name;
3. phase-specific sanitized fallback.

Fallback messages:

```text
Contract simulation reverted.
Transaction submission failed because the contract call reverted.
Transaction reverted by contract.
```

Ngoài ra:

- Simulation revert không được trình bày như mined revert.
- Submission error trước khi có hash không được khẳng định transaction đã tốn gas on-chain.
- Terminal lifecycle dùng receipt evidence, không dùng error code.
- UI không render raw provider payload.
- Outer error được giữ trong `cause` để debug.

## Boundaries

- Error code không thay thế lifecycle evidence.
- Feature không remap foundation error code sang meaning khác.
- Error type mới của Viem/Wagmi phải được thêm vào mapping một cách có chủ đích, không rơi im lặng vào generic code.

## Enforcement

- Type system: `EvmErrorCode` union.
- Error adapter là boundary bắt buộc cho mọi Web3 error.
- Error adapter tests theo từng phase.
- Write status tests cho quan hệ error/lifecycle.
- Review policy khi thêm error code.

## Code and tests

Implementation:

- `src/web3/evm/errors/evm-errors.ts`
- `src/web3/evm/errors/evm-error.adapter.ts`

Tests:

- `src/web3/evm/errors/evm-error.adapter.test.ts`
- `src/web3/evm/types/evm-write-status.test.ts`
