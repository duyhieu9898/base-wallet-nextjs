# Web3 Foundation Architecture

Tài liệu này mô tả cấu trúc, ownership và extension boundaries hiện tại của reusable Web3 foundation.

Các invariant chi tiết nằm trong `decisions/`.

Phạm vi capability nằm trong `CAPABILITIES.md`.

Quy tắc application sử dụng và mở rộng foundation nằm trong `EXTENSION_CONTRACT.md`.

## 1. Foundation identity

Foundation là reusable Web3 frontend infrastructure độc lập với business logic của một dApp cụ thể.

Foundation không quyết định thay application:

- chain family được sử dụng;
- production network;
- default network;
- supported tokens;
- feature contracts;
- authentication;
- backend, indexer hoặc analytics;
- product-specific UI và business rules.

EVM là runtime implementation duy nhất hiện tại.

## 2. Design principles

### Registry-driven configuration

Supported EVM networks, RPC metadata, explorers, native currency và ERC-20 metadata đến từ registry, không hardcode trong UI, hooks hoặc feature code.

### Truthful state

Selection, transaction lifecycle và terminal receipt status phải biểu diễn evidence thực tế, không biểu diễn suy đoán.

### Pure logic separated from I/O

Adapters chứa validation, builders, mappers và derivation thuần. Services chứa external I/O. Hooks orchestration React/Wagmi. Components render state và phát user intent.

### Safety at domain boundaries

Read/write readiness, simulation, duplicate-submit protection, lifecycle, receipt tracking và cache invalidation thuộc domain hooks, không thuộc form UI.

### Side-effect isolation

Storage, callbacks và cache side effects không được biến một transaction đã broadcast thành submission failure.

### No fake fallback

Read failure, partial failure và unsupported selection phải được biểu diễn rõ; không tạo balance, receipt hoặc metadata giả.

### Runtime validation

JSON, environment variables, local storage và external RPC/library data được xem là untrusted tại boundary.

### Abstraction after evidence

Không tạo shared abstraction trước khi có consumer và invariant thực tế.

## 3. System context

```text
Application / dApp
        ↓ adopts
Foundation public API
        ↓
EVM runtime
        ↓
Wallet / RPC / blockchain
```

Application thêm business features phía trên foundation:

```text
Application feature
        ↓
Reusable Web3 components and hooks
        ↓
EVM adapters and services
        ↓
Wagmi / Viem
        ↓
Wallet / RPC
```

Foundation không import application feature.

## 4. Module ownership

```text
src/web3/
├── core/
├── evm/
│   ├── abi/
│   ├── adapters/
│   ├── clients/
│   ├── hooks/
│   ├── registry/
│   ├── selection/
│   ├── services/
│   ├── storage/
│   ├── types/
│   ├── errors.ts
│   └── evm-provider.tsx
└── web3-providers.tsx
```

| Layer                    | Responsibility                                       |
| ------------------------ | ---------------------------------------------------- |
| `core/`                  | Concepts đã được chứng minh không phụ thuộc family   |
| `evm/registry/`          | EVM network và token configuration                   |
| `evm/selection/`         | EVM wallet/network readiness                         |
| `evm/adapters/`          | Pure validation, builders, mappers và derivation     |
| `evm/services/`          | Viem I/O ngoài React                                 |
| `evm/hooks/`             | React/Wagmi lifecycle orchestration                  |
| `evm/storage/`           | Versioned client persistence                         |
| `components/web3/`       | Reusable presentation và user intent                 |
| `features/`              | Application business behavior                        |
| `chain-family-template/` | Checklist documentation cho family runtime tương lai |

## 5. Foundation module classification

### Core EVM foundation

Các phần sau tạo reusable EVM runtime boundary và không được bỏ nếu application vẫn dùng EVM foundation:

- network/token registry;
- wallet/network selection;
- typed read boundaries;
- typed write readiness;
- error normalization;
- transaction lifecycle;
- cache ownership;
- provider composition.

### Optional foundation modules

Application có thể giữ, thay thế hoặc bỏ nếu không cần:

- local transaction history;
- fee preview UI;
- reusable transfer/approval forms;
- reusable transaction status components;
- i18n reference shell.

Bỏ optional module không được làm yếu core read/write safety.

### Reference and development-only

Các phần sau không phải product requirement:

- `Web3Lab`;
- example networks và tokens;
- Sepolia local-write script;
- public RPC defaults;
- Chain-family implementation template (documentation only).

Application adoption phải review, thay thế hoặc xóa các reference defaults không phù hợp.

## 6. Public API boundary

Application và feature sử dụng public API của foundation.

Allowed consumption:

- exported EVM hooks;
- exported EVM domain types;
- registry selectors;
- reusable Web3 domain components;
- documented application composition points.

Application không được phụ thuộc trực tiếp vào:

- internal refs của write hooks;
- private query-key implementation;
- low-level mutation calls dùng để bypass review;
- test helpers;
- internal adapter implementation chỉ phục vụ một hook;
- undocumented deep imports được xem là private.

Public entrypoints hiện được xác định bởi các exported hooks, types và components được application sử dụng có chủ đích. Deep imports khác được xem là private.

## 7. EVM application adoption

Để tạo một EVM dApp từ foundation:

1. Chọn supported EVM network entries.
2. Chọn default EVM chain ID từ registry.
3. Cấu hình RPC overrides cho từng environment.
4. Review và thay thế sample token metadata.
5. Thêm feature-specific contracts trong application feature layer.
6. Chọn optional foundation modules cần giữ.
7. Xóa hoặc ẩn reference/dev-only UI không dùng.
8. Chạy registry tests, live read smoke và application validation.

Đổi từ một EVM network sang một EVM network khác thông thường chỉ thay đổi:

- network registry;
- token metadata;
- RPC environment configuration;
- network-specific smoke/write verification;
- feature contract deployments.

Việc đổi supported EVM network không được yêu cầu sửa:

- wallet selection state model;
- typed error taxonomy;
- transaction lifecycle;
- receipt evidence rules;
- duplicate-submit protection;
- cache ownership.

Nếu một network được gọi là EVM nhưng vi phạm một assumption hiện tại của foundation, thay đổi đó phải được xử lý như architecture change, không được che bằng configuration.

## 8. EVM runtime flows

### Selection

```text
wallet connection
→ chain detection
→ disconnected | connecting | ready | unsupported
```

Xem `decisions/0006-wallet-selection-state.md`.

### Reads

```text
component
→ read hook
→ ready-selection gate
→ registry
→ Wagmi query hoặc Viem service
→ pure mapper
→ UI model
```

Xem:

- `decisions/0001-network-and-token-registry.md`
- `decisions/0007-shared-read-logic.md`
- `decisions/0009-cache-ownership-and-invalidation.md`

### Writes

```text
user input
→ prepare
→ review
→ confirm
→ wallet request
→ hash
→ receipt tracking
→ cache/history side effects
```

Xem:

- `decisions/0005-write-readiness-and-submission-safety.md`
- `decisions/0008-write-hooks-and-transaction-lifecycle.md`
- `decisions/0011-transaction-review-and-fee-preview.md`

### Local history

Local transaction history là optional persistence module và không phải chain source of truth.

Xem `decisions/0012-local-transaction-history.md`.

## 9. Trust and security boundary

- Foundation không lưu, truyền hoặc quản lý private key.
- Wallet là signing authority.
- RPC và wallet-provider responses là external data.
- JSON registry, environment variables và local storage phải được runtime validate.
- `NEXT_PUBLIC_*` variables không được chứa secret.
- Transaction hash chỉ chứng minh wallet/provider trả một identifier; hash không chứng minh success.
- Chỉ receipt evidence chứng minh terminal execution status.
- Local transaction history không phải chain truth.
- UI không được bypass domain write guards.
- Application business policy có thể chặt hơn foundation nhưng không được làm yếu safety invariant.

## 10. Chain-family extension seam

Foundation giữ ranh giới để một chain family khác có thể được triển khai độc lập.

Một family runtime mới phải sở hữu riêng:

- account/address types;
- wallet integration;
- network registry;
- provider/client;
- asset model;
- reads và writes;
- error normalization;
- transaction lifecycle;
- cache ownership;
- tests.

Không được:

- dùng EVM `Address` cho family khác;
- dùng EVM transaction hash type cho family khác;
- ép mọi family vào universal `sendTransaction`;
- đưa shared abstraction vào `core/` trước khi có ít nhất hai runtime consumers thật.

`src/web3/chain-family-template/` không phải module runtime. Multi-family
execution không phải capability hiện tại hoặc committed roadmap. Một family mới
chỉ được thêm khi có application requirement đã được chấp thuận.

## 11. Testing and quality

Foundation dùng bốn proof boundaries:

- pure tests;
- hook tests;
- live read smoke;
- local testnet write verification.

Chi tiết nằm trong `decisions/0010-testing-strategy.md`.

Automated baseline:

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test:run
pnpm build
```

Không claim command pass nếu chưa chạy.

Network-specific smoke hoặc write commands trong repository là reference examples. Application phải thay hoặc mở rộng chúng theo network được adopt.

```bash
pnpm web3:smoke
pnpm web3:smoke -- --chainId <chainId>
```

## 12. Change checklist

Một foundation change phải giữ:

- registry-driven metadata;
- one authoritative selection state;
- read/write gating;
- pure logic separated from I/O;
- no UI write bypass;
- typed phase-aware errors;
- receipt-evidence terminal status;
- duplicate-submit và stale-operation safety;
- side-effect isolation;
- targeted cache invalidation;
- application/foundation dependency direction;
- abstraction only after real demand;
- tests at the correct proof boundary.

## 13. Related authority

- `CAPABILITIES.md`
- `EXTENSION_CONTRACT.md`
- `decisions/README.md`
