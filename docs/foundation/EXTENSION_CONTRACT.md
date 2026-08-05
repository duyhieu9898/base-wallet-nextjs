# Foundation Extension Contract

Tài liệu này định nghĩa cách application và feature được phép sử dụng, giới hạn và mở rộng Web3 foundation.

## 1. Nguyên tắc chung

Application được phép:

- sử dụng ít capability hơn foundation;
- thêm product constraints chặt hơn;
- compose nhiều foundation hooks;
- thêm business validation;
- thêm feature-specific contracts;
- thêm warnings và application policy;
- thêm backend/indexer/analytics;
- triển khai feature-specific services và components.

Application không được âm thầm làm yếu foundation safety invariant.

## 1.1. Application adoption contract

Khi foundation được dùng để xây một dApp, application phải quyết định:

1. Adopt family module nào.
2. Bật network nào.
3. Default network là gì.
4. Feature nào dùng family context nào.
5. Application restrictions nào được thêm.
6. Contract deployments nằm ở đâu.

Foundation không quyết định thay application những mục trên.

### Assumption EVM hiện tại

Việc một dApp "tạm giả định khách hàng dùng EVM" là quyết định của application project, không phải foundation invariant.

Ghi quyết định đó trong application docs:

```text
docs/product/foundation-adoption.md
```

Ví dụ:

```markdown
## Adopted runtime

- EVM module

## Initial network assumption

- Sepolia during development
- Final production network pending customer decision
```

Không sửa foundation decision chỉ vì khách hàng đổi Sepolia → Arbitrum hoặc Ethereum → Polygon.

### Adoption flows

#### EVM-only dApp

- enable EVM module;
- configure supported EVM networks;
- add feature contracts trong application layer.

#### Additional-family dApp

Chỉ thực hiện sau khi family runtime được hoàn thành theo
`src/web3/chain-family-template/README.md`. Không load EVM providers nếu
application không adopt EVM.

## 2. Stricter, not weaker

Application có thể ràng buộc chặt hơn foundation.

Ví dụ hợp lệ:

```text
Foundation:
mọi chain nằm trong registry đều có thể write

Application:
chỉ cho write trên Sepolia
```

Ví dụ không hợp lệ:

```text
Foundation:
transaction phải Prepare → Review → Confirm

Application:
gọi writeContract trực tiếp để bỏ review
```

Application restriction là product policy.

Bypass foundation safety là architecture violation.

## 3. Public consumption boundary

Application tiêu thụ public API của family module đã adopt. Family module quyết
định public surface của mình; file tree bên trong là private.

### 3.1. Public paths của EVM module

```text
@/web3/evm            runtime API (hooks, domain types, registry selectors)
@/web3/evm/address    pure address primitives, React-free và wagmi-free
@/web3/evm/errors     pure error taxonomy, React-free và wagmi-free
@/web3/web3-providers provider composition cho các family đã adopt
```

Mọi path khác dưới `src/web3/**` là internal. ESLint enforce ranh giới này.

Hai leaf path pure tồn tại vì lý do kỹ thuật cụ thể: pure domain code (ví dụ
SIWE message building, wallet binding, MSW handlers) cần address/error helper
nhưng không được kéo cả EVM runtime — provider, wagmi config và mọi hook — vào
module graph của mình.

Vì lý do đó `EvmProvider` **không** nằm trong `@/web3/evm`. Provider composition
đi qua `@/web3/web3-providers`, nơi application chọn family runtime nào được
mount.

### 3.2. Hai tier của `@/web3/evm`

**Tier A — Application API.** Hooks, domain types và registry selectors mà UI
dùng trực tiếp. Chúng đã đóng gói sẵn toàn bộ safety invariant của foundation.

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

Feature hook được phép gọi write hook của Wagmi cho contract của chính nó — đó
là điều `0015` quy định — miễn là đi qua lifecycle guard ở trên. UI layer thì
không: component không submit transaction trực tiếp.

Application UI nên tiêu thụ:

- Tier A hooks;
- exported domain types;
- exported registry selectors;
- reusable components dưới `src/components/web3/`.

Application UI không nên trực tiếp:

- gọi Viem public client cho flow foundation đã hỗ trợ;
- gọi `writeContract` hoặc `sendTransaction`;
- tự map Viem/Wagmi errors;
- tự invalidate Wagmi query cache;
- đọc internal refs/state của write hooks;
- import internal test helpers.

## 4. Feature-local ownership

Một capability bắt đầu ở feature layer khi nó:

- chỉ có một consumer;
- chứa business-specific semantics;
- phụ thuộc custom contract;
- có application-specific permission hoặc UX;
- chưa chứng minh được shared invariant.

Ví dụ:

```text
src/features/staking/
├── components/
├── hooks/
├── adapters/
├── services/
├── contracts/
└── types/
```

Staking-specific concerns:

- staking contract address;
- reward calculation;
- lock duration;
- claim policy;
- pool status;

không tự động thuộc foundation.

## 5. Khi nào promote vào foundation?

Một primitive chỉ được promote từ feature vào foundation khi:

1. Có ít nhất hai consumer thực tế hoặc một invariant rõ ràng sẽ được dùng lại.
2. Semantics giữa các consumer thực sự giống nhau.
3. Feature-local duplication đã xuất hiện.
4. Abstraction không che mất contract/domain differences.
5. Có public API rõ.
6. Có runtime boundary rõ.
7. Có tests chứng minh invariant.
8. Migration cost được hiểu.
9. Foundation capability và decisions được cập nhật.

Không promote abstraction chỉ vì tên function giống nhau.

## 6. Feature contract registry

Custom contract deployments mặc định thuộc feature.

Ví dụ:

```text
src/features/staking/contracts/staking-contracts.ts
```

Chỉ tạo shared feature-contract registry khi nhiều feature cần chung các semantics:

- chain-based deployment lookup;
- enabled/disabled deployment;
- runtime address validation;
- typed feature key;
- deployment environment policy.

## 7. Error handling

Feature được phép thêm feature-specific error codes.

Feature không được:

- thay đổi meaning của foundation error codes;
- biến `SIMULATION_REVERTED` thành mined revert;
- suy `success` hoặc `reverted` khi chưa có receipt;
- hiển thị raw RPC payload không được sanitize.

Feature error có thể wrap foundation error và giữ original cause.

## 8. Cache ownership

Foundation-owned data:

- balance;
- allowance;
- receipt;
- registry metadata;
- local Web3 transaction history.

Feature-owned data:

- staking positions;
- vault shares;
- indexed events;
- prices;
- backend transaction metadata;
- user-specific application records.

Feature không mirror foundation-owned balance/allowance sang store riêng nếu không có requirement và invalidation policy rõ.

## 9. Application restrictions

Application có thể tạo policy riêng như:

- chỉ cho phép một số chain;
- chỉ cho phép một số token;
- cấm unlimited approval;
- đặt maximum transfer amount;
- yêu cầu authentication;
- yêu cầu compliance acknowledgement;
- giới hạn feature theo region/account.

Application restriction phải nằm trong application product/decision docs, không sửa foundation decision trừ khi foundation invariant thay đổi.

## 10. Foundation modification rule

Một feature không được sửa foundation chỉ để giải quyết local convenience.

Foundation chỉ thay đổi khi:

- public reusable capability thay đổi;
- invariant thay đổi;
- shared extension point được thêm;
- bug nằm trong foundation;
- feature đã chứng minh shared abstraction cần thiết.

Foundation change phải:

1. có focused scope;
2. cập nhật architecture/capabilities/decisions liên quan;
3. có regression tests;
4. không phụ thuộc ngược vào feature;
5. không hardcode application policy.

## 11. Dependency direction

```text
Application feature
      ↓ uses
Web3 foundation public API
      ↓
Wagmi / Viem / Query
```

Không hợp lệ:

```text
Web3 foundation
      ↓ imports
Application feature
```

Foundation không được biết staking, payment, vault hoặc application-specific route.

## 12. Foundation adoption record

Khi repository được phát triển thành một application cụ thể, application nên tạo:

```text
docs/product/foundation-adoption.md
```

Nội dung tối thiểu:

```markdown
# Foundation Adoption

Foundation: base-wallet-nextjs
Foundation commit/version: <value>

## Adopted chain-family modules

- ...

## Supported networks và default network

- ...

## Adopted capabilities

- ...

## Application restrictions

- ...

## Local extensions

- ...

## Known deviations

- ...
```

Application docs chỉ link foundation decisions cần thiết, không copy toàn bộ foundation internals.

## 13. EVM extension checklists

### 13.1. Thêm EVM network

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

### 13.2. Thêm ERC-20 token

1. Thêm entry vào `evm-tokens.json`.
2. Dùng address làm key.
3. Khai báo đúng `expectedDecimals`.
4. Không duplicate normalized address.
5. Chạy runtime validation tests.
6. Chạy live smoke để đối chiếu metadata.

### 13.3. Thêm read hook

Bắt buộc:

- gate theo selection ready;
- dùng registry;
- dùng canonical query keys;
- tái sử dụng pure builder/mapper khi có service;
- normalize typed errors;
- xác định partial failure policy;
- có pure tests và hook tests.

### 13.4. Thêm write hook

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

### 13.5. Thêm feature contract

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

### 13.6. Thêm chain-family runtime

Checklist này áp dụng khi thêm một chain-family runtime mới.

Một chain family mới không được ép vào EVM abstractions nếu semantics khác.

Cần xác định riêng:

- wallet selection;
- account model;
- transaction lifecycle;
- registry;
- reads/writes;
- error taxonomy;
- provider boundaries;
- cache ownership.

Ngoài ra:

- shared core chỉ chứa concepts thực sự đồng nhất;
- không promote một shared core type trước khi có hai real consumers;
- application choice không đồng nghĩa foundation change: bật/tắt một family trong một dApp không phải lý do sửa foundation decision.

## 14. Decision filters

Trước khi thêm một abstraction hoặc dependency vào foundation, phải trả lời:

1. Có consumer thật hay mới chỉ là dự đoán?
2. Đây là concern dùng chung hay business-specific?
3. Logic có thể ở feature layer không?
4. Có duplication thực tế cần loại bỏ không?
5. Abstraction có che mất domain semantics quan trọng không?
6. Invariant của abstraction có thể kiểm thử không?
7. Dependency có tạo vendor lock-in không cần thiết không?
8. Khi xóa consumer đầu tiên, abstraction còn giá trị không?
9. Có làm tăng runtime state hoặc failure modes không?
10. Có thay đổi public API hoặc migration cost không?

Không có câu trả lời rõ ràng thì mặc định giữ implementation nhỏ và local.
