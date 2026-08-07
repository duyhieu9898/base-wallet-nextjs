# Web3 Foundation Capabilities

Tài liệu này mô tả phạm vi hiện tại của reusable Web3 foundation.

Nó không định nghĩa những gì mọi dApp bắt buộc phải có. Nó chỉ định nghĩa các capability mà foundation này lựa chọn hỗ trợ.

## Trạng thái

| Trạng thái          | Ý nghĩa                                                             |
| ------------------- | ------------------------------------------------------------------- |
| `Ready`             | Đã được triển khai trong foundation                                 |
| `Deferred`          | Có thể bổ sung khi có consumer hoặc operational requirement rõ ràng |
| `Product-dependent` | Thuộc application hoặc feature cụ thể                               |
| `Non-goal`          | Không trở thành trách nhiệm mặc định của foundation                 |

## Implementation status

| Module/capability                    | Trạng thái        |
| ------------------------------------ | ----------------- |
| Foundation/application separation    | Ready             |
| Chain-family module boundary         | Ready             |
| EVM module                           | Ready             |
| EVM multi-network registry           | Ready             |
| EVM read/write lifecycle             | Ready             |
| Chain-family implementation template | Ready             |
| Multi-family provider composition    | Deferred          |
| Cross-family application UX          | Product-dependent |

```text
EVM runtime tồn tại
≠
foundation bị khóa cứng vào một EVM dApp
```

## Ready foundation boundaries

- Foundation/application documentation separation.
- Chain-family module isolation.
- Provider composition point.
- Extension contract.
- Feature-local ownership.
- Shared core boundaries.

## Ready EVM runtime

### Wallet và network

- Injected wallet connection.
- Wallet disconnect.
- Supported/unsupported network detection.
- Discriminated wallet selection state:
  - `disconnected`;
  - `connecting`;
  - `ready`;
  - `unsupported`.
- Supported-chain read/write guards.
- Explorer transaction/address links.

### Registry

- Central EVM network registry.
- ERC-20 token registry theo chain.
- Runtime validation cho registry JSON.
- Duplicate normalized-address detection.
- Native asset lấy từ chain metadata.
- RPC environment overrides.

### Reads

- Native balance.
- ERC-20 balances.
- ERC-20 allowances.
- Multicall.
- Request deduplication.
- Partial failure handling.
- Shared pure builders/mappers.
- Canonical Wagmi query ownership.

### Writes

- Native transfer.
- ERC-20 transfer.
- ERC-20 approval.
- ERC-20 approval amount `0` để revoke.
- Contract simulation với connected wallet account.
- Prepare → Review → Confirm flow.
- Gas/fee preview.
- Mainnet warning.
- Unlimited approval warning.

### Transaction lifecycle

- `idle`;
- `simulating`;
- `ready`;
- `awaiting-signature`;
- `confirming`;
- `success`;
- `reverted`;
- `rejected`;
- `error`.

### Safety

- Typed error normalization.
- Phase-aware simulation/submission/receipt errors.
- Wallet user-rejection detection (`isUserRejectedWalletRequest`) — public, dùng
  được bởi mọi flow cần ví ký, không riêng transaction.
- Receipt-evidence terminal status.
- Duplicate-submission protection.
- Synchronous submitted-hash guard.
- Async operation ownership.
- Account/chain/token/spender stale-operation isolation.
- Recovery sau simulation/submission failure.
- Once-per-hash receipt side effects.
- Local receipt tracking escape.

### Cache và local history

- Targeted balance/allowance invalidation.
- Versioned local transaction history.
- Same-tab synchronization.
- Cross-tab synchronization.
- Pending receipt reconciliation.
- Storage side-effect isolation.
- Maximum history size và deduplication.

## Ready application shell

- Reusable Web3 domain components.
- Transaction feedback provider for UI-only write progress. A feature calls
  `useTransactionFeedback().begin()` when the user confirms; its write hook
  remains the source of truth for hash and receipt status. It shows at most two
  bottom-right notifications: success closes after 5 seconds, rejected after 3
  seconds, and reverted or receipt-tracking failures require manual dismissal.
- Dev-only Web3 composition harness.
- English/Japanese i18n.
- Hydration-safe locale initialization.
- Document language synchronization.

## Ready validation

- Pure adapter tests.
- Hook lifecycle tests.
- Real TanStack QueryClient trong hook tests.
- Live read-only RPC smoke tests.
- Local EVM testnet write script.
- Typecheck, lint, format, tests và Next.js build.

## Ready chain-family implementation template

`CHAIN_FAMILY_TEMPLATE.md` defines the required ownership,
decisions, and completion criteria for a future chain-family runtime. It is
documentation only and does not add a dependency, provider, or supported
network.

## Deferred capabilities

Mỗi deferred item phải có:

- lý do chưa triển khai;
- trigger để xem xét lại;
- boundary hiện tại;
- điều không được làm tạm thời.

Deferred không đồng nghĩa với committed roadmap.

### WalletConnect hoặc wallet UI kit

Hiện injected connector đủ cho baseline.

Trigger để xem xét lại:

- mobile wallet deep linking;
- QR connection;
- nhiều connector;
- wallet discovery UX.

### RPC health và fallback

Chưa triển khai vì cần:

- provider ownership;
- failover policy;
- retry budget;
- rate-limit semantics;
- observability;
- consistency requirements.

### Structured observability

Typed errors đã có, nhưng chưa có reporter hoặc tích hợp vendor. Quy tắc
normalization, local debugging và redaction nằm trong
`decisions/0017-error-normalization-and-observability.md`.

Trigger để xem xét lại:

- production application;
- event schema ổn định;
- redaction policy;
- alerting/retention requirements.

### Feature contract registry

Chưa triển khai. Quy tắc deferred và boundary nằm trong
`decisions/0016-feature-contract-registry.md`.

Chỉ thêm khi có feature contract consumer thật như:

- staking;
- vault;
- payment;
- escrow;
- swap router.

### Approval orchestration for feature writes

Foundation already provides allowance reads, ERC-20 approval writes and shared
write lifecycle safety. It does not yet provide a generic approval-preflight or
approval-then-primary-write flow.

Trigger để xem xét lại:

- ít nhất hai feature contract consumers có cùng allowance preflight và UX hai bước;
- product xác định spender policy, approval amount policy và receipt behavior;
- có flow thật như staking, ERC-20 payment hoặc contract-mediated NFT transfer.

Không được làm tạm thời:

- một generic `useTransaction` nhận arbitrary ABI/callback;
- tự động approve rồi submit primary transaction mà không có review và xác nhận riêng;
- giả định mọi ERC-20 hoặc NFT action đều cần approval.

### Fork-node write automation

Chỉ thêm khi deterministic integration tests trở nên cần thiết.

### Complete component interaction tests

Hook/domain invariants hiện được ưu tiên. Application cụ thể bổ sung UI tests theo user flows thật.

### Additional chain-family runtime

Chỉ triển khai khi có application requirement. Start from
`CHAIN_FAMILY_TEMPLATE.md`; do not add an SDK, metadata
catalog, or universal multi-chain type beforehand.

### Multi-network EVM application

Không deferred: EVM registry đã hỗ trợ cấu hình nhiều EVM networks.

Application quyết định network nào được expose và cách người dùng switch. Foundation hiện dùng một selected EVM chain tại một thời điểm; concurrent EVM chain contexts trong cùng một view cần một quyết định architecture riêng.

### Multi-family simultaneous application

Deferred cho đến khi có ít nhất hai executable family runtimes.

Khi đó cần quyết định riêng cho provider composition, cross-family cache ownership và cross-family transaction UX.

## Product-dependent capabilities

Các capability sau thuộc application:

- SIWE/SIWS;
- backend sessions;
- application authentication;
- user profiles;
- access control;
- indexer;
- transaction enrichment;
- token pricing;
- portfolio valuation;
- notifications;
- analytics;
- compliance;
- feature-specific contract deployments;
- staking/vault/swap/governance/payment business rules;
- application deployment strategy;
- production incident response.

## Explicit non-goals

Foundation không:

- lưu hoặc quản lý private key;
- ký thay người dùng;
- trở thành custody wallet;
- tạo balance hoặc receipt giả;
- che giấu read/write failure bằng fallback giả;
- cho phép UI bypass review/write guards;
- trở thành universal transaction engine;
- tự triển khai nonce replacement/cancel mặc định;
- thay thế backend hoặc indexer;
- bắt buộc một wallet vendor;
- bắt buộc một RPC vendor;
- bắt buộc một observability vendor;
- chứa business contract address không có consumer thật;
- đảm bảo finality ngoài dữ liệu chain cung cấp;
- tự chọn chain/network thay application;
- hứa mọi blockchain chạy được chỉ bằng config;
- tự failover giữa các chain family;
- ép các chain family vào một transaction model giả;
- coi implementation template là production runtime;
- hardcode customer chain selection vào foundation docs.

"Any chain" luôn bị giới hạn bởi các family module đã thực sự được triển khai.

Application được phép bổ sung các capability product-specific ở bên ngoài foundation.
