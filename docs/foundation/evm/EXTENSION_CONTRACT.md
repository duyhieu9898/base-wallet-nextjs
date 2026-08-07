# EVM Extension Contract

Tài liệu này định nghĩa public surface của `@nln/web3-evm` và các checklist mở
rộng runtime EVM.

Quy tắc chung — application được phép làm gì, khi nào promote, dependency
direction, adoption record — nằm ở [`../EXTENSION_CONTRACT.md`](../EXTENSION_CONTRACT.md)
và áp dụng cho mọi family. Tài liệu này chỉ nói về EVM.

## 1. Public paths của EVM module

```text
@nln/web3-evm                runtime API (hooks, domain types, registry selectors)
@nln/web3-evm/address        pure address primitives, React-free và wagmi-free
@nln/web3-evm/errors         pure error taxonomy, React-free và wagmi-free
@nln/web3-evm/errors/adapter Viem/Wagmi RPC error normalization adapter
@nln/web3-evm/contracts      generic contract deployment types và hydration helpers (0016)
@nln/web3-evm/registry       pure registry read selectors (explorer URL, network lookup)
@nln/web3-evm/config         runtime configuration injection leaf
@nln/web3-evm/provider       EvmProvider và wagmi config adapter
@nln/web3-evm/testing        live RPC smoke verification của chính package
apps/<app>/src/providers/web3-providers.tsx  application provider composition root
```

Mọi path khác dưới `packages/web3-evm/src/**` là internal. ESLint enforce ranh
giới này.

Ba leaf path pure (`address`, `errors`, `registry`) tồn tại vì lý do kỹ thuật cụ
thể: pure domain code (ví dụ SIWE message building, wallet binding, MSW handlers)
cần address/error helper nhưng không được kéo cả EVM runtime — provider, wagmi
config và mọi hook — vào module graph của mình.

`registry` phục vụ cùng lý do đó cho chain metadata: admin application render
wallet address và transaction hash thành explorer link nhưng không bao giờ
connect wallet, nên không được buộc phải phụ thuộc `wagmi` và
`@tanstack/react-query`. Leaf này chỉ chứa read selector; mọi write flow và hook
vẫn nằm sau barrel chính. `apps/n-plus-admin` là consumer thực tế của hình dạng
này — nó khai báo `@nln/web3-evm` nhưng không khai báo `wagmi` hay
`@tanstack/react-query`.

Vì lý do đó `EvmProvider` **không** nằm trong barrel chính của `@nln/web3-evm`.
Provider composition đi qua `@/providers/web3-providers`, nơi application chọn
family runtime nào được mount.

## 2. Hai tier của `@nln/web3-evm`

**Tier A — Application API.** Hooks, domain types và registry selectors mà UI
dùng trực tiếp. Chúng đã đóng gói sẵn toàn bộ safety invariant của runtime.

**Tier B — Feature Extension API.** Primitive để một feature tự triển khai
contract-specific write flow theo `0015`: `useEvmWriteLifecycle`,
`assertEvmWriteReady`, `deriveEvmWriteStatus`, `EvmWeb3Error`,
`createEvmWeb3Error`, `toEvmWeb3Error`, `isUserRejectedWalletRequest` và các
registry selector dạng strict.

Tier B là public **có kiểm soát**. Feature dùng Tier B bắt buộc:

- thực hiện `Prepare → Review → Confirm`;
- simulation với connected account trước khi mở wallet request;
- đi qua `useEvmWriteLifecycle` cho mọi submission;
- không kết luận success chỉ từ transaction hash;
- giữ stale-operation protection khi account/chain/token/spender đổi;
- coi receipt là terminal evidence duy nhất cho success/revert;
- giữ side effects (callback, invalidation, history) once-per-hash.

Feature hook được phép gọi write hook của Wagmi cho contract của chính nó — đó là
điều `0015` quy định — miễn là đi qua lifecycle guard ở trên. UI layer thì không:
component không submit transaction trực tiếp.

Application UI nên tiêu thụ:

- Tier A hooks;
- exported domain types;
- exported registry selectors;
- reusable components dưới `apps/<app>/src/components/web3/`.

Application UI không nên trực tiếp:

- gọi Viem public client cho flow runtime đã hỗ trợ;
- gọi `writeContract` hoặc `sendTransaction`;
- tự map Viem/Wagmi errors;
- tự invalidate Wagmi query cache;
- đọc internal refs/state của write hooks;
- import internal test helpers.

## 3. Error handling — quy tắc riêng của EVM

Quy tắc chung nằm ở `../EXTENSION_CONTRACT.md` §7. Riêng EVM:

- không biến `SIMULATION_REVERTED` thành mined revert;
- không suy `success` hoặc `reverted` khi chưa có receipt;
- không hiển thị raw Viem/Wagmi error message hoặc RPC payload.

## 4. Cache ownership — dữ liệu do EVM runtime sở hữu

- balance;
- allowance;
- receipt;
- registry metadata;
- local EVM transaction history.

Feature không mirror balance/allowance sang store riêng nếu không có requirement
và invalidation policy rõ.

## 5. Extension checklists

### 5.1. Thêm EVM network

1. Thêm chain vào network registry.
2. Thêm RPC environment override nếu cần.
3. Thêm token map cho chain nếu có supported ERC-20.
4. Kiểm tra explorer/native metadata.
5. Chạy registry tests.
6. Chạy:

```bash
pnpm web3:smoke -- --chainId <chainId>
```

Không thêm network bằng cách hardcode chain trong component hoặc hook.

### 5.2. Thêm ERC-20 token

1. Thêm entry vào `evm-tokens.json`.
2. Dùng address làm key.
3. Khai báo đúng `expectedDecimals`.
4. Không duplicate normalized address.
5. Chạy runtime validation tests.
6. Chạy live smoke để đối chiếu metadata.

### 5.3. Thêm read hook

Bắt buộc:

- gate theo selection ready;
- dùng registry;
- dùng canonical query keys;
- tái sử dụng pure builder/mapper khi có service;
- normalize typed errors;
- xác định partial failure policy;
- có pure tests và hook tests.

### 5.4. Thêm write hook

Bắt buộc:

- object input signature;
- `assertEvmWriteReady`;
- prepare/review/confirm flow;
- simulation với account nếu là contract write;
- immutable submission snapshot;
- duplicate-submit guards;
- operation ownership;
- receipt evidence;
- typed errors;
- once-per-hash side effects;
- targeted invalidation;
- submission, rejection, revert và stale-operation tests.

### 5.5. Thêm feature contract

Trước khi thêm registry dùng chung, phải có feature thật.

Feature cần xác định:

- supported chains;
- address per chain;
- ABI ownership;
- enabled state;
- deployment validation;
- read/write boundaries;
- invalidation rules;
- error semantics.

Business-specific contracts nên bắt đầu ở feature layer.

## 6. Thêm một chain family khác

Không thuộc tài liệu này. Một family mới là sibling package độc lập và không
được ép vào các abstraction EVM ở trên. Xem
[`../CHAIN_FAMILY_TEMPLATE.md`](../CHAIN_FAMILY_TEMPLATE.md) và
`../EXTENSION_CONTRACT.md` §13.
