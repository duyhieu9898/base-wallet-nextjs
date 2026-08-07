# Web3 Foundation

`docs/foundation/` chứa tài liệu authoritative của reusable Web3 foundation trong `base-wallet-nextjs`.

Foundation tổ chức blockchain support theo các chain-family modules độc lập, tách reusable infrastructure khỏi business logic của một dApp cụ thể.

Foundation-level primitives:

- module isolation giữa các chain family;
- authority separation giữa foundation và application;
- registry pattern cho network/asset metadata;
- extension boundaries;
- provider composition point;
- feature/foundation dependency rule.

EVM reference implementation:

- wallet và network selection;
- native và ERC-20 balances;
- ERC-20 allowances;
- transaction preparation, simulation và review;
- fee preview;
- typed Web3 errors;
- transaction lifecycle;
- submission safety;
- cache invalidation;
- local transaction history;
- reusable Web3 domain components;
- testing boundaries.

Foundation không chứa business logic của một dApp cụ thể.

## Product statement

`base-wallet-nextjs` là một production-oriented Web3 frontend foundation được thiết kế để tách reusable blockchain infrastructure khỏi business logic của một dApp cụ thể.

Foundation tổ chức blockchain support theo các chain-family modules độc lập.

Trạng thái hỗ trợ chi tiết của từng runtime (EVM, Solana) và danh mục capabilities khả dụng nằm tại [`CAPABILITIES.md`](CAPABILITIES.md). Hướng dẫn trung lập để thêm một chain family mới nằm tại [`CHAIN_FAMILY_TEMPLATE.md`](CHAIN_FAMILY_TEMPLATE.md).

Foundation không có một technology stack duy nhất — mỗi lớp có stack riêng:

```text
Host / reference applications   Next.js App Router · React · TypeScript
EVM runtime (@nln/web3-evm)     Wagmi · Viem · TanStack Query
Family runtime tiếp theo        dependencies riêng của nó
```

Wagmi và Viem là dependency của **runtime EVM**, không phải của foundation. Một
family runtime khác mang stack khác, và điều đó không làm nó kém "foundation"
hơn.

Foundation giúp một feature dApp mới bắt đầu từ nền móng đã có invariant rõ ràng, thay vì mỗi feature tự xây lại wallet, read, write và transaction lifecycle.

Foundation phù hợp làm nền cho payment/token transfer dApp, staking và vault frontend, token dashboard, claim hoặc mint flow, governance frontend, escrow, portfolio dashboard, swap frontend và các ứng dụng gọi custom contracts trên một chain family đã có runtime. Foundation không chứa sẵn business logic của những sản phẩm đó.

## Foundation không chọn network thay khách hàng

Foundation không quyết định network cuối cùng của application.

Khi foundation được dùng để phát triển một dApp, application mới quyết định:

- chain family nào được adopt;
- network nào được hỗ trợ;
- default network;
- active selection policy;
- feature và contract deployments;
- application-specific restrictions.

Foundation chỉ cung cấp module boundaries, reusable primitives, safety invariants, extension contract và reference implementations.

## Chain family, network và adoption

| Khái niệm            | Ý nghĩa                                                                        |
| -------------------- | ------------------------------------------------------------------------------ |
| Chain family         | Hệ sinh thái có account, wallet, address, transaction và execution model riêng |
| Network              | Một network cụ thể thuộc một chain family                                      |
| Foundation module    | Implementation độc lập cho một chain family                                    |
| Application adoption | Quyết định của dApp về family/network/feature/constraint                       |

Ví dụ chain family: `EVM`.

Ví dụ network của EVM: Ethereum Mainnet, Sepolia, Arbitrum, Polygon, BSC. Sepolia hoặc Arbitrum không phải chain family khác EVM.

Một chain family khác không phải fallback của EVM. Không tồn tại behavior tự chuyển family khi EVM lỗi. Chi tiết về các operational modes và capability scope được quản lý duy nhất tại [`CAPABILITIES.md`](CAPABILITIES.md).

## Production-oriented, không phải production-complete

Các domain primitive và transaction safety trong foundation được thiết kế để tái sử dụng trong sản phẩm thật.

Một production dApp cụ thể vẫn phải bổ sung theo nhu cầu vận hành của nó, ví dụ authentication, backend APIs, indexing, observability, RPC provider strategy, compliance, feature-specific contracts, analytics, product-specific UI tests, deployment và incident procedures.

Không được mô tả foundation này như một platform production hoàn chỉnh không cần thêm quyết định sản phẩm hoặc vận hành.

Danh sách đầy đủ non-goals nằm trong `CAPABILITIES.md`.

## Authority map

Tài liệu chia theo ba lớp. Đừng trộn chúng: một rule cần tới các từ `receipt`,
`chainId`, ERC-20, allowance, spender, Wagmi hay Viem để phát biểu được thì nó
thuộc lớp runtime, không phải lớp foundation.

### Lớp foundation — family-neutral

| Tài liệu                     | Trách nhiệm                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `ARCHITECTURE.md`            | Family package isolation, ownership split, dependency direction, trust principles  |
| `CAPABILITIES.md`            | SSOT của capability scope và runtime status                                        |
| `EXTENSION_CONTRACT.md`      | Quy tắc application/feature sử dụng và mở rộng foundation                          |
| `FEATURE_MODULE_CONTRACT.md` | Host capability, anatomy và 8 safety obligation của feature module                 |
| `CHAIN_FAMILY_TEMPLATE.md`   | Checklist bắt buộc trước khi thêm một chain family mới — tài liệu, không phải code |
| `decisions/`                 | Rule đúng với mọi family (`0010`, `0014`, `0017`)                                  |

### Lớp runtime — mỗi family một thư mục

| Tài liệu                         | Trách nhiệm                                                        |
| -------------------------------- | ------------------------------------------------------------------ |
| `evm/ARCHITECTURE.md`            | Module ownership, public API, flows, terminal evidence             |
| `evm/EXTENSION_CONTRACT.md`      | Public paths, Tier A/B, extension checklists                       |
| `evm/FEATURE_MODULE_CONTRACT.md` | Cơ chế EVM cho 8 safety obligation                                 |
| `evm/ADOPTION_GUIDE.md`          | Cách adopt runtime EVM cho một dApp mới                            |
| `evm/decisions/`                 | Rule riêng của EVM (`0001`–`0009`, `0011`, `0012`, `0015`, `0016`) |

Solana chưa có thư mục runtime. Requirement đã được ghi tại
[`solana-runtime-requirement.md`](solana-runtime-requirement.md); `solana/` được
tạo khi implementation bắt đầu.

### Lớp application

Không nằm ở đây. Application ↔ runtime mapping và monorepo architecture nằm ở
[`../ARCHITECTURE.md`](../ARCHITECTURE.md).

Ngoài các tài liệu authority trên, `package-scope-evidence.md` ghi bằng chứng đo được về scope và các verdict "chưa tạo package nào". Nó **không phải authority** — khi mâu thuẫn, `decisions/` và các tài liệu authority thắng.

## Foundation và application

Foundation documentation phải độc lập với application documentation.

Khi repository được dùng để phát triển một dApp cụ thể:

```text
docs/foundation/
→ authority của reusable Web3 foundation

docs/product/
docs/decisions/
docs/plans/
docs/ARCHITECTURE.md
→ authority của application
```

Application docs không được copy hoặc mô tả lại toàn bộ foundation internals.

Application chỉ cần ghi:

- foundation version/commit đang sử dụng;
- capability nào được adopt;
- application restrictions;
- local extensions;
- foundation decision nào có liên quan.

## Khi nào cần đọc gì?

### Implement một application feature

Đọc:

1. application feature document;
2. application decision liên quan;
3. `CAPABILITIES.md`;
4. `EXTENSION_CONTRACT.md`;
5. foundation decision cụ thể khi feature chạm invariant đó.

Không cần đọc toàn bộ foundation decisions.

### Sửa một foundation primitive

Đọc:

1. `ARCHITECTURE.md` nếu chạm ranh giới giữa các family, hoặc `<family>/ARCHITECTURE.md` nếu chỉ chạm một runtime;
2. `CAPABILITIES.md`;
3. `EXTENSION_CONTRACT.md` và `<family>/EXTENSION_CONTRACT.md`;
4. decision liên quan — kiểm tra đúng thư mục scope;
5. implementation và tests liên quan.

### Thêm một abstraction dùng chung

Trước tiên phải chứng minh:

- có consumer thật;
- invariant thực sự dùng chung;
- feature-local implementation không còn phù hợp;
- abstraction không che mất domain semantics;
- có thể kiểm thử độc lập.

## Change policy

Foundation documentation chỉ thay đổi khi reusable foundation thay đổi.

Một feature application thông thường không được sửa foundation docs chỉ vì nó sử dụng foundation.

Cập nhật foundation documentation trong cùng commit khi thay đổi:

- public Web3 hook API;
- selection states;
- write lifecycle;
- error taxonomy;
- registry schema;
- cache owner;
- transaction safety invariant;
- local storage schema;
- testing boundary;
- deferred/non-goal scope;
- supported chain-family strategy;
- extension boundary.
