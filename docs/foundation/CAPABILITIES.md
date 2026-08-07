# Web3 Foundation Capabilities

Tài liệu này là **Single Source of Truth (SSOT)** duy nhất cho phạm vi capability và trạng thái hỗ trợ runtime (EVM vs Solana) của reusable Web3 foundation.

Nó không định nghĩa những gì mọi dApp bắt buộc phải có. Nó chỉ định nghĩa các capability mà foundation này lựa chọn hỗ trợ. Tất cả các tài liệu khác — `ARCHITECTURE.md`, `README.md`, `../ARCHITECTURE.md`, các tài liệu runtime dưới `evm/`, `nln-feature-source-map.md`, `plans/` — phải trỏ về file này thay vì tự định nghĩa hoặc lặp lại trạng thái runtime/capability.

## Trạng thái

| Trạng thái          | Ý nghĩa                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| `Ready`             | Executable runtime hoàn chỉnh, đạt definition of done                                            |
| `In Progress`       | Implementation đã tồn tại nhưng chưa đạt definition of done                                      |
| `Planned`           | Requirement đã được chấp nhận và ghi nhận; implementation chưa bắt đầu                           |
| `Deferred`          | Chưa có requirement được chấp nhận; bổ sung khi có consumer hoặc operational requirement rõ ràng |
| `Product-dependent` | Thuộc application hoặc feature cụ thể                                                            |
| `Non-goal`          | Không trở thành trách nhiệm mặc định của foundation                                              |

Lifecycle một chiều:

```text
Deferred → Planned → In Progress → Ready
```

Không bao giờ ghi một ô ở dạng `In Progress / Ready`. Một capability ở đúng một
trạng thái tại một thời điểm; nếu không xác định được thì trạng thái là cái thấp
hơn.

Điều kiện chuyển trạng thái của một chain-family runtime:

- `Deferred → Planned`: application requirement được chấp nhận **và** ghi nhận
  theo [`CHAIN_FAMILY_TEMPLATE.md`](CHAIN_FAMILY_TEMPLATE.md) mục "Before writing
  code". Chưa có record đó thì chưa phải `Planned`.
- `Planned → In Progress`: package tồn tại và code đã bắt đầu.
- `In Progress → Ready`: đạt "Definition of done" của `CHAIN_FAMILY_TEMPLATE.md`
  — provider, selection state, ít nhất một read và một write flow thật,
  confirmation evidence, typed errors, focused tests, application adoption
  documentation.

## Implementation status

| Module/capability                    | Trạng thái        |
| ------------------------------------ | ----------------- |
| Foundation/application separation    | Ready             |
| Chain-family module boundary         | Ready             |
| EVM module (`@nln/web3-evm`)         | Ready             |
| Solana module (`@nln/web3-solana`)   | Planned           |
| EVM multi-network registry           | Ready             |
| EVM read/write lifecycle             | Ready             |
| Chain-family implementation template | Ready             |
| Multi-family provider composition    | Deferred          |
| Cross-family application UX          | Product-dependent |

`@nln/web3-solana` là `Planned`: requirement của Neura System đã được chấp nhận
và ghi tại [`solana-runtime-requirement.md`](solana-runtime-requirement.md).
Chưa có package, chưa có code. Nó chuyển sang `In Progress` khi
`packages/web3-solana/` tồn tại.

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

## Reference application shell — **không phải capability của foundation package**

Các mục dưới đây thuộc `apps/n-plus`, không thuộc `@nln/web3-evm` hay bất kỳ
family package nào. Decision `0014` chốt: foundation không export presentation;
application sở hữu presentation. Chúng được liệt kê ở đây vì chúng là reference
implementation kèm theo repository, và một application adopt runtime có thể copy,
thay thế hoặc bỏ hẳn chúng.

Hệ quả quan trọng cho family runtime thứ hai: `@nln/web3-solana` **không** cần
i18n, toast, component hay web3-lab để được coi là một runtime. Definition of
done nằm ở `CHAIN_FAMILY_TEMPLATE.md`, và không mục nào trong danh sách này thuộc
đó.

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

Foundation generic schema, deployment types và validation helpers đã **Ready** tại `@nln/web3-evm` (`packages/web3-evm/src/contracts/`).

Application contract deployment registry data thuộc phạm vi **Product-dependent** (đã active tại `apps/n-plus/src/contracts/registry/deployments.json`). Foundation không lưu trữ hay hardcode hợp đồng sản phẩm của ứng dụng. Quy tắc tổ chức nằm trong `evm/decisions/0016-feature-contract-registry.md`.

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

### Additional chain-family runtime beyond Solana

Solana không còn nằm ở mục này — nó đã là `Planned`, xem bảng
"Implementation status".

Một family thứ ba chỉ triển khai khi có application requirement được chấp nhận và
ghi nhận theo `CHAIN_FAMILY_TEMPLATE.md`. Không thêm SDK, metadata catalog hay
universal multi-chain type trước đó.

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
