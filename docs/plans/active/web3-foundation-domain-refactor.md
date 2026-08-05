# Execution Plan: Web3 Foundation Domain Organization Refactor

Date: 2026-08-05

## Status

Active

## Outcome

`src/web3/evm` được tổ chức theo `chain-family → domain/capability → technical
implementation` thay vì theo technical layer (`adapters/ hooks/ services/
storage/ types/`), với:

- một public boundary duy nhất tại `@/web3/evm`, chia hai tier có chủ đích;
- dependency direction được enforce bằng ESLint;
- code, type và test nằm cạnh capability sở hữu chúng;
- seam cho phép thêm `src/web3/solana/` như sibling runtime sau này;
- **không thay đổi behavior**, không làm yếu bất kỳ transaction safety invariant
  nào.

Observable result: toàn bộ repository-required checks pass, không có behavior
diff quan sát được ở wallet connection, read, write, review, receipt và history.

## Context

Thứ tự ưu tiên áp dụng cho toàn bộ plan này:

```text
Foundation authority (docs/foundation/decisions/)
→ implementation hiện tại
→ tests
→ execution plan (file này)
```

Khi plan mâu thuẫn với decision hoặc với current truth, **plan sai** và phải
được sửa tại chỗ.

Authority bắt buộc đọc trước khi bắt đầu:

```text
docs/foundation/README.md
docs/foundation/ARCHITECTURE.md
docs/foundation/CAPABILITIES.md
docs/foundation/EXTENSION_CONTRACT.md
docs/foundation/decisions/README.md
docs/WORKFLOW.md
```

Decisions phân bổ theo phase:

| Decision                                     | Phase                                          |
| -------------------------------------------- | ---------------------------------------------- |
| `0013` i18n and hydration                    | 2 (provider tree, hydration)                   |
| `0015` feature write flows                   | 2 (Tier B public API), 4 (staking integration) |
| `0001` network and token registry            | 3                                              |
| `0002` selector policy                       | 3 (registry/selection)                         |
| `0003` native asset model                    | 3 (registry), 4 (native transfer)              |
| `0004` web3 error normalization              | 3                                              |
| `0006` wallet selection state                | 3                                              |
| `0007` shared read logic                     | 3                                              |
| `0005` write readiness and submission safety | 4                                              |
| `0008` write hooks and transaction lifecycle | 4                                              |
| `0009` cache ownership and invalidation      | 4                                              |
| `0011` transaction review and fee preview    | 4                                              |
| `0012` local transaction history             | 4                                              |
| `0014` web3 component organization           | 4                                              |
| `0016` feature contract registry             | 5                                              |
| `0017` error normalization and observability | 5                                              |
| `0010` testing strategy                      | mọi phase khi test ownership đổi               |

Documentation là authority về invariant, nhưng phải kiểm tra implementation và
tests hiện tại trước khi kết luận behavior thực tế.

## Scope

In scope:

- Tổ chức lại `src/web3/evm/**` theo domain/capability.
- Tạo `src/web3/evm/index.ts` làm public boundary hai tier.
- Audit và phân loại lại `src/web3/core/**`.
- ESLint enforce dependency direction.
- Migrate application/feature imports sang public entrypoint.
- Di chuyển reusable EVM-semantic components vào `src/web3/evm/components/`.
- Chuẩn hóa `src/features/staking/` theo ownership rõ ràng.
- Cập nhật foundation authority trong cùng phase làm đổi responsibility.

Out of scope (non-goals):

- Solana runtime, Solana SDK, Solana provider hoặc bất kỳ dependency Solana nào.
- `Web3Address`, `UniversalWallet`, `UniversalTransaction`, universal
  `useWallet`/`useTransaction`.
- Generic `useTransaction` nhận arbitrary ABI + callback.
- Approval orchestration abstraction (`useApprovalRequirement`,
  `useApprovalThenWriteFlow`) — bị `0015` chặn cho tới khi có ≥2 consumer thật.
- Refactor `src/features/auth/**` (xem "Scope feature").
- Monorepo/workspace package.
- Thay Wagmi/Viem/TanStack Query.
- Thay đổi network, RPC, token address, ABI, transaction status semantics.
- Xóa test đang bảo vệ safety invariant, hoặc sửa expectation để che regression.
- Formatter chạy toàn repository.

## Approach

Năm phase tuần tự. Mỗi phase để repository ở trạng thái buildable + testable.
Không bắt đầu phase kế tiếp khi audit gate hiện tại chưa pass.

Ưu tiên `git mv`. Không đổi tên và đổi behavior cùng lúc. Temporary re-export
shim được phép nhưng phải đánh dấu và liệt kê để xóa ở Phase 5.

Không tạo thư mục rỗng — chỉ tạo folder khi có file thực tế.

### Kiến trúc đích

```text
src/
├── app/
│   └── providers.tsx              # composition root, giữ nguyên thứ tự
├── providers/
│   ├── query-provider.tsx
│   └── mock-provider.tsx
├── components/
│   ├── ui/                        # generic primitives, không hiểu Web3
│   └── web3/                      # application-owned web3 presentation
│       └── common/transaction-feedback.tsx
├── web3/
│   ├── core/                      # chỉ primitive chain-family-neutral
│   ├── evm/
│   │   ├── index.ts               # public boundary (Tier A + Tier B)
│   │   ├── provider/
│   │   ├── clients/
│   │   ├── address/
│   │   ├── chain/
│   │   │   ├── registry/
│   │   │   └── selection/
│   │   ├── reads/
│   │   │   ├── balances/
│   │   │   └── allowances/
│   │   ├── transactions/
│   │   │   ├── lifecycle/
│   │   │   ├── receipt/
│   │   │   ├── review/
│   │   │   ├── fees/
│   │   │   ├── history/
│   │   │   ├── native-transfer/
│   │   │   ├── erc20-transfer/
│   │   │   └── erc20-approval/
│   │   ├── contracts/erc20/       # hoặc evm/abi/ — quyết định ở Phase 3
│   │   ├── errors/
│   │   ├── components/            # reusable, hiểu EVM semantics
│   │   └── testing/
│   ├── web3-providers.tsx         # mặc định giữ (adapter mỏng)
│   └── chain-family-template/     # đã tồn tại, README-only
├── contracts/registry/            # application-owned
└── features/
    ├── auth/                      # KHÔNG refactor
    └── staking/
```

`src/web3/solana/` không được tạo trong refactor này.

---

## Phase 1 — Baseline, inventory và refactor map

### Mục tiêu

Xác minh current truth trước khi di chuyển code. Không thay đổi behavior, không
di chuyển implementation.

### Công việc

1. Ghi lại current structure, provider composition, mọi import từ
   application/feature vào foundation, mọi deep import vào EVM internals, vị trí
   tests, query/cache ownership, transaction lifecycle ownership.
2. Lập refactor mapping (`Current path → Target path → Tier → Direct consumers →
Relevant tests → Relevant decision`) bao phủ tối thiểu: registry, selection,
   balances, allowances, error normalization, write lifecycle, receipt tracking,
   transaction review, fee estimation, transaction history, native transfer,
   ERC-20 transfer, ERC-20 approval, reusable components, provider composition,
   ABI, clients, services, invalidation adapter, wagmi config adapter,
   `web3/core/**`.
3. Phân loại từng export: Tier A / Tier B / Internal / Testing-only.
4. Chạy full baseline và ghi exact results.

### Baseline results (2026-08-05)

Chạy trên `main`, working tree không có modified file (plan này là untracked).

```text
pnpm typecheck:    PASS
pnpm lint:         PASS   (exit 0, no output)
pnpm format:check: FAIL   (exit 1) — pre-existing
pnpm test:run:     PASS   (48 files, 491 tests)
pnpm build:        PASS   (Next 16.2.12 Turbopack, 6/6 static pages)
git diff --check:  PASS   (exit 0)
pnpm web3:smoke:   not run
```

`pnpm format:check` failure — chi tiết chính xác:

```text
Command:      pnpm format:check  (prettier . --check)
Failure:      [warn] docs/plans/active/web3-foundation-domain-refactor.md
Affected:     1 file, chỉ là plan document này
Pre-existing: có — tồn tại trước mọi refactor edit
Not a regression source: file này không thuộc src/, không ảnh hưởng
              typecheck/lint/test/build
Resolution:   fix bằng prettier --write CHỈ trên file này khi rewrite plan.
              Sau đó format:check phải PASS và mọi failure về sau là regression.
```

Cách phân biệt pre-existing vs regression về sau: baseline trên đã đưa 4/5
command về PASS và command thứ 5 về PASS ngay sau khi rewrite plan. Vì vậy từ
Phase 2 trở đi, **bất kỳ failure nào của 5 command trên đều là regression** và
phải được sửa hoặc revert trong chính phase phát hiện.

### Observed architecture (current truth)

- `src/web3/evm/` tổ chức theo technical layer: `abi/ adapters/ clients/ hooks/
registry/ selection/ services/ storage/ types/` + `config.ts`, `errors.ts`,
  `evm-provider.tsx`.
- `src/web3/core/` chứa `address.utils.ts`, `registry.selectors.ts`,
  `registry.types.ts`, `types.ts`.
- `src/web3/web3-providers.tsx` là adapter mỏng, chỉ render `<EvmProvider>`.
- `src/app/providers.tsx` đã là composition root, thứ tự provider được document
  là constraint.
- Reusable web3 components ở `src/components/web3/**` (theo `0014`).
- Foundation **không** import `@/features`, `@/contracts`, `@/app` — đã verify,
  0 kết quả.
- Application/feature **đang** deep import EVM internals (xem Phase 2).

### Audit Gate 1

- [x] Baseline commands chạy thật, exact results ghi ở trên.
- [x] Xác nhận không thêm Solana runtime.
- [x] Xác nhận không có behavior change trong Phase 1.
- [x] `git diff --check` clean.
- [ ] Mapping đầy đủ cho các capability chính (bảng Phase 2/3/4 bên dưới là
      mapping cấp phase; mapping chi tiết per-file hoàn tất khi vào từng phase).
- [x] Danh sách deep imports (xem Phase 2).

---

## Phase 2 — Public API hai tier, dependency boundaries, provider composition

### Mục tiêu

Thiết lập ranh giới module trước khi di chuyển internals.

### 1. Public API chia hai tier

Tạo `src/web3/evm/index.ts`. Đây **không** chỉ phục vụ UI application.

**Tier A — Application API** (UI dùng trực tiếp):

```text
useEvmSelection
useEvmNativeBalance
useEvmTokenBalance
useEvmTokenBalances
useEvmAllowance
useEvmAllowances
useSendEvmNative
useSendEvmToken
useApproveEvmToken
transaction review/status public types
```

**Tier B — Feature Extension API** (feature tự triển khai contract-specific
write flow theo `0015`):

```text
useEvmWriteLifecycle
assertEvmWriteReady
assertEvmReadReady
deriveEvmWriteStatus
EvmWeb3Error
createEvmWeb3Error
public error codes
intentional registry selectors
allowance primitives cần cho feature flow
```

Tier B là **public có kiểm soát**, không phải internal accidental export.

Contract của Tier B phải được document rõ tại `index.ts` và trong
`EXTENSION_CONTRACT.md`. Consumer của Tier B:

- vẫn phải thực hiện `Prepare → Review → Confirm`;
- phải simulation trước wallet submission;
- phải dùng lifecycle guard;
- không được kết luận success chỉ từ hash;
- phải giữ stale-operation protection;
- phải xử lý receipt terminal evidence;
- phải giữ once-per-hash side effects.

**Không** export: internal operation refs, low-level query keys, invalidation
implementation, storage internals, test helpers, internal builders chỉ có một
domain consumer, và bất kỳ wrapper nào cho phép submit bỏ qua review.

`useEvmWriteLifecycle` chuyển về `src/web3/evm/transactions/lifecycle/` ở Phase 4
nhưng vẫn re-export qua `@/web3/evm`.

Có thể tạo `index.ts` trong từng domain để hỗ trợ root entrypoint, nhưng
application/feature phải import từ `@/web3/evm`.

### 2. Deep imports hiện tại cần migrate

`features/auth` (production code):

```text
domain/wallet-binding.ts        → evm/selection/evm-selection, core/address.utils
domain/auth-error.ts            → evm/adapters/evm-wallet-rejection
domain/siwe-message.ts          → core/address.utils
hooks/use-siwe-login.ts         → evm/selection/{evm-selection,use-evm-selection}, core/address.utils
hooks/use-authenticated-wallet.ts → evm/selection/use-evm-selection
components/sign-in-with-wallet.tsx → evm/selection/use-evm-selection
components/wallet-binding-modal.tsx → core/address.utils
```

`features/auth` (test code — 6 file):

```text
auth-flow.integration.test.tsx, domain/wallet-binding.test.ts,
runtime/logout.test.tsx, components/auth-wallet-binding-gate.test.tsx,
components/auth-status.test.tsx, hooks/use-siwe-login.test.tsx
→ evm/adapters/evm-registry.adapter, evm/selection/evm-selection,
  evm/registry/evm-network.registry
```

`features/staking`:

```text
components/staking-action-panel.tsx   → evm/hooks/use-approve-evm-token, evm/adapters/evm-registry.adapter
components/staking-approval-panel.tsx → evm/hooks/use-approve-evm-token, evm/adapters/evm-registry.adapter
hooks/use-staking-position.ts         → evm/selection/use-evm-selection
hooks/use-staking-write.ts            → evm/adapters/{evm-error,evm-registry}.adapter, evm/errors,
                                        evm/hooks/{use-evm-allowance,use-evm-write-lifecycle},
                                        evm/selection/{assert-evm-write-ready,use-evm-selection},
                                        evm/types/evm-write-status
```

Test files của auth **không** được miễn boundary vô thời hạn. Phương án ưu tiên:
migrate sang intentional testing/public selectors. Nếu không khả thi trong
Phase 2, dùng ESLint override với **danh sách file cụ thể** (6 file trên), ghi
vào "Temporary shims" và xóa ở Phase 5. Không dùng glob rộng kiểu
`**/*.test.*`.

### 3. ESLint enforce dependency direction

Dùng `no-restricted-imports` built-in. Không thêm dependency mới.

Rule bắt buộc (hard boundary, enforce được chính xác):

```text
src/web3/**     ✗ import từ src/features/**, src/app/**, application contracts
src/features/** ✗ deep import @/web3/evm/** và @/web3/core/**
src/features/** ✓ import từ @/web3/evm
```

**Điều chỉnh so với quyết định ban đầu — cần bạn xác nhận.**

Quyết định ban đầu yêu cầu chặn `features/** → useWriteContract` và
`features/** → useSendTransaction`. Kiểm tra code cho thấy rule này sẽ chặn
đúng pattern mà `0015` cho phép:

```text
src/features/staking/hooks/use-staking-write.ts:68  useWriteContract()
src/web3/evm/hooks/use-send-evm-token.ts:85         useWriteContract()
src/web3/evm/hooks/use-approve-evm-token.ts:87      useWriteContract()
src/web3/evm/hooks/use-send-evm-native.ts:61        useSendTransaction()
```

Ba call này **cấu trúc giống hệt nhau**. `0015` nói rõ feature hook "owns its
contract ABI, request validation, simulation, review, history model and domain
cache invalidation" — tức feature _phải_ tự phát ra lệnh write cho contract của
nó. Cấm `useWriteContract` trong `features/**` sẽ buộc staking hoặc bỏ qua
foundation, hoặc đẻ ra generic write abstraction (`0015` Boundaries cấm).

Điều thực sự phân biệt an toàn với bypass là _gọi `useWriteContract` mà không
qua lifecycle guard_ — ESLint không diễn đạt được điều kiện này.

Rule thay thế đề xuất (enforce được, vẫn đúng ý định):

```text
src/features/**/components/**  ✗ useWriteContract, useSendTransaction
                                 (UI layer không được submit trực tiếp)
src/features/**/hooks/**       ✓ được phép, kèm bắt buộc dùng lifecycle guard
src/components/**              ✗ useWriteContract, useSendTransaction
```

Guarantee "không bypass lifecycle" được bảo vệ bằng **test + review policy**
(`0015` Enforcement đã quy định feature phải có focused tests cho preflight và
approval-to-primary receipt transition), không phải bằng lint.

Không cấm toàn bộ `wagmi`: `useSignMessage` (auth SIWE), `useReadContract`
(staking position), `useWaitForTransactionReceipt`
(pending-receipt-reconciler) là consumer hợp lệ.

### 4. Provider composition

`src/app/providers.tsx` **đã là composition root đúng**. Không thay bằng snippet
đơn giản hóa. Giữ nguyên thứ tự:

```text
I18n → Mock → Query → Web3Providers → AuthRuntime
→ TransactionFeedback → AuthBootstrap → AuthWalletBindingGate
```

Phase 2 chỉ được:

- xác minh ownership;
- quyết định giữ hay inline `src/web3/web3-providers.tsx` — **mặc định giữ**, vì
  nó là adapter mỏng cho EVM provider; inline chỉ khi làm boundary rõ hơn thật
  sự và không tạo diff thừa;
- bảo đảm EVM provider không tự sở hữu application-level providers;
- giữ nguyên hydration, auth, SIWE, MSW và transaction feedback behavior;
- giữ nguyên connector behavior, supported networks, default chain, query client
  config, wallet connection behavior.

### 5. Documentation trong Phase 2

Cập nhật ngay trong phase này:

- `EXTENSION_CONTRACT.md`: public API hai tier + Tier B contract.
- `ARCHITECTURE.md` / `CAPABILITIES.md`: nếu đang mô tả khác.
- `0013`, `0015`: nếu authority hiện tại mô tả khác current truth.

### Audit Gate 2

Không sang Phase 3 nếu:

- root EVM public API chưa rõ hai tier;
- còn undocumented deep imports từ application/feature;
- ESLint chưa enforce dependency direction;
- provider tree bị đổi behavior;
- có duplicate QueryClient hoặc nested provider ngoài chủ đích;
- validation command có regression;
- temporary shim chưa được liệt kê để xóa.

---

## Phase 3 — Chain, reads, errors và audit `web3/core/`

### Mục tiêu

Chuyển registry, selection, reads, errors sang domain layout. Phân loại lại
`core/`. Không thay behavior.

### 1. Audit `src/web3/core/`

Mục tiêu của `core/`: **chỉ chứa primitive thật sự chain-family-neutral.**

Lập bảng bắt buộc:

```text
Core item | Current consumers | Chain-family-neutral? | Target owner | Action
```

Item đã biết cần phân loại:

```text
core/registry.types.ts  → export EvmNetworkKey        → EVM-specific
core/address.utils.ts   → EVM address semantics       → EVM-specific
core/registry.selectors.ts → cần audit consumers
core/types.ts           → NATIVE_ASSET_ID             → cần audit theo 0003
```

Một item chỉ được ở `core/` nếu chứng minh được nó không phụ thuộc: EVM address
format, EVM chain ID, ERC-20, Wagmi/Viem, receipt/hash semantics, EVM network
registry.

Nếu chỉ EVM dùng, chuyển về owner EVM:

```text
src/web3/evm/chain/registry/types.ts
src/web3/evm/address/address.utils.ts
```

Không đổi tên thành abstraction universal. Lưu ý `features/auth` import
`core/address.utils` — việc di chuyển phải đi kèm export qua `@/web3/evm`.

### 2. Chain registry → `evm/chain/registry/`

Tổ chức: `data/config`, `runtime validation`, `selectors`, `tests`.

Giữ nguyên: network entries, chain IDs, RPC env overrides, explorers, native
currency metadata, token metadata, token decimals, duplicate normalized-address
validation, default chain behavior.

UI và feature không đọc registry JSON trực tiếp.

### 3. Selection → `evm/chain/selection/`

Giữ authoritative states `disconnected | connecting | ready | unsupported`,
`assertEvmReadReady`, `assertEvmWriteReady`, selection snapshot semantics,
supported-chain behavior. Không tạo generic `Web3Selection`.

### 4. Balances → `evm/reads/balances/`

Đặt cạnh nhau: public hooks, pure request builders, pure mappers, domain result
types, tests. Không thay query ownership hoặc query-key behavior.

### 5. Allowances → `evm/reads/allowances/`

Giữ spender semantics, registry validation, multicall behavior, partial failure
policy, canonical query ownership. Không đưa approval orchestration vào read
domain.

### 6. Errors → `evm/errors/`

Giữ `EvmWeb3Error`, public error codes, phase-aware normalization, wallet
rejection detection, simulation/submission/receipt distinction, cause
preservation, payload sanitization. Không tạo common `Web3Error` cho Solana.

### 7. ABI ownership

Quyết định vị trí `evm/abi/erc20.ts`: `evm/contracts/erc20/` hoặc giữ
`evm/abi/`. ERC-20 ABI là EVM standard, **không** ép vào feature.

### 8. Tests

Di chuyển tests cùng owner. Không gom vào một thư mục chung.

### 9. Documentation trong Phase 3

Cập nhật ngay: `0001`, `0002`, `0003`, `0004`, `0006`, `0007`.

### Validation

```bash
pnpm test:run -- src/web3/evm/chain
pnpm test:run -- src/web3/evm/reads
pnpm test:run -- src/web3/evm/errors
```

Rồi full baseline. Kiểm tra thêm: registry data không đổi ngoài formatting bắt
buộc; không có chain/token hardcode mới; query keys không đổi arbitrary;
selection behavior không đổi; public import paths vẫn hoạt động.

### Audit Gate 3

Không sang Phase 4 nếu: registry selectors/validation chưa có owner rõ;
selection state bị duplicate; read hooks bypass registry/readiness; on-chain
state bị mirror sang store mới; error taxonomy đổi meaning; `core/` còn EVM
type chưa được phân loại có chủ đích; validation có regression.

---

## Phase 4 — Transaction slices và reusable EVM components

Phase rủi ro cao nhất. Không kết hợp với redesign behavior.

### 1. Shared mechanics

```text
transactions/lifecycle/  duplicate-submit guards, operation ownership,
                         stale-operation isolation, once-per-hash receipt
                         handling, lifecycle derivation
transactions/receipt/    receipt tracking (use-evm-transaction-receipt)
transactions/review/     review types, shared presentation model, helpers có
                         nhiều consumer thật
transactions/fees/       fee estimate types, fee estimation hook, fee error
                         isolation
transactions/history/    versioned persistence, pending reconciliation,
                         same-tab/cross-tab sync
```

Không đưa domain-specific simulation, history shape hoặc invalidation vào shared
lifecycle.

### 2. Vertical slices

`native-transfer/`, `erc20-transfer/`, `erc20-approval/` — mỗi slice sở hữu
preparation, simulation (trừ native), review, public hook, targeted
invalidation, history mapping, tests. Approval slice sở hữu thêm spender,
approval amount, revoke `0`, unlimited approval warning input. Không thêm
generic approval-then-write flow.

### 3. Files chưa có target — quyết định trong phase này

Với từng file, phân loại thành: `domain-local implementation` | `shared EVM
infrastructure` | `application-owned composition` | `obsolete wrapper`.

```text
evm/clients/create-evm-public-client.ts → evm/clients/ (shared infrastructure)
evm/adapters/wagmi-config.adapter.ts    → evm/provider/
evm/evm-provider.tsx                    → evm/provider/
evm/config.ts                           → cần audit consumers
evm/services/evm-balance.service.ts     → reads/balances/ (domain-local)
evm/services/evm-allowance.service.ts   → reads/allowances/ (domain-local)
evm/adapters/evm-invalidation.adapter.ts→ domain tương ứng, hoặc shared cache
                                          module nếu có nhiều consumer thật
evm/hooks/use-evm-network.ts            → chain/
evm/hooks/use-evm-wallet.ts             → chain/selection/ hoặc provider/
evm/hooks/use-evm-token-list.ts         → chain/registry/
evm/hooks/use-evm-transaction-receipt.ts→ transactions/receipt/
evm/storage/                            → transactions/history/
```

Không ép mọi `service` biến mất — giữ nếu nó là domain-local implementation
hợp lệ.

### 4. Components

Chuyển vào `src/web3/evm/components/` các component reusable **hiểu trực tiếp
EVM semantics**:

```text
EVM transaction review
EVM fee display
EVM receipt status
network mismatch presentation
EVM address presentation
```

**Giữ lại** `src/components/web3/common/transaction-feedback.tsx` ở vị trí
application-owned. Lý do: nó được application composition root mount, xử lý
presentation/application feedback, không phải EVM runtime primitive; nó có thể
consume public transaction state nhưng không thuộc foundation lifecycle.

Generic primitives ở lại `src/components/ui/`. Feature-specific component ở
feature. `web3-lab.tsx` là dev harness, không phải public component.

### 5. Safety verification

Xác minh trực tiếp implementation + tests cho: simulation dùng connected
account; prepare không submit; review dùng immutable prepared snapshot; double
confirm chỉ gửi một lần; prepare/reset bị chặn khi có active transaction;
pre-hash contract failure không bị báo là mined revert; retry sau recoverable
failure; account/chain/token/spender change không cho stale operation overwrite;
receipt success/revert là terminal evidence; callback + invalidation once-per-
hash; storage failure không biến submission thành failure; receipt tracking
escape không bị mô tả như on-chain cancel.

### 6. Documentation trong Phase 4

Cập nhật **ngay trong phase này**, không hoãn sang Phase 5: `0005`, `0008`,
`0009`, `0011`, `0012`, `0014`, `0015`.

`0014` đặc biệt: khi component ownership đã đổi thì decision cũ không còn mô tả
current truth.

### Validation

```bash
pnpm test:run -- src/web3/evm/transactions/lifecycle
pnpm test:run -- src/web3/evm/transactions/native-transfer
pnpm test:run -- src/web3/evm/transactions/erc20-transfer
pnpm test:run -- src/web3/evm/transactions/erc20-approval
pnpm test:run -- src/web3/evm/components
```

Rồi full baseline. Không dùng live RPC thay cho automated tests.

### Audit Gate 4

Bắt buộc lập bảng `Invariant | Implementation owner | Test owner | Test result`
bao phủ: readiness, simulation, review snapshot, duplicate submit, stale
operation, user rejection, pre-hash failure, receipt success, receipt revert,
targeted invalidation, once-per-hash side effects, history/storage isolation.

Behavior change ngoài scope phải sửa hoặc revert **trong** phase này.

---

## Phase 5 — Feature boundary, cleanup, final audit

### 1. Scope feature — chỉ `features/staking`

**Không refactor `features/auth`.** Auth có ownership model riêng (`api/`,
`domain/`, `hooks/`, `runtime/`) hợp lý cho auth/SIWE và không cần bị ép theo
contract-feature shape.

Target staking (không bắt buộc, không phải taxonomy cứng):

```text
features/staking/
├── index.ts
├── contracts/
├── domain/
├── queries/
├── transactions/
├── hooks/          # giữ nếu hook là application orchestration hợp lệ
└── components/
```

Lưu ý: `features/staking/public.ts` đang là entrypoint — quyết định giữ tên
`public.ts` hay đổi `index.ts`, không làm cả hai.

Feature sở hữu: ABI, deployment selector usage, business validation, domain
review, contract-specific simulation, feature query keys, feature cache
invalidation, feature components.

Feature không: bypass foundation invariant; tự normalize Viem/Wagmi error đã có
foundation boundary; tự invalidate foundation-owned balance/allowance ngoài
documented extension; hardcode contract deployment trong component.

### 2. Contract registry boundary

Giữ `src/contracts/registry/`. Xác nhận: network/token registry không chứa
feature contracts; feature hook không hardcode deployment address; missing
deployment trả explicit unavailable/error; không fallback sang chain khác; ABI
ownership thuộc feature hoặc documented ABI owner.

### 3. Xóa temporary shims

Xóa re-export cũ, compatibility paths, duplicate index files, empty legacy
folders, dead imports, dead test helpers, migration-only comments. Search toàn
repo trước khi xóa.

Danh sách temporary shim hiện có (cập nhật 2026-08-05 sau Phase 2):

```text
eslint.config.mjs — override "no-restricted-imports: off" cho
  src/components/web3/history/pending-receipt-reconciler.tsx
  → xóa sau khi Phase 4 chuyển file này vào transactions/history/

src/web3/evm/address/index.ts — hiện re-export từ @/web3/core/address.utils
  → Phase 3 chuyển implementation về đây, bỏ re-export

src/web3/evm/index.ts — TODO(phase-3) ở block address exports
```

Không còn ESLint override nào cho auth test file: toàn bộ auth test đã migrate
sang public path trong Phase 2.

### 4. Documentation consistency audit

Phase 5 **chỉ** làm consistency audit + update code/test path references.
Authority changes đã phải hoàn tất ở phase tương ứng. Cập nhật `0016`, `0017`
nếu responsibility đổi. Không tạo decision mới chỉ để mô tả refactor thư mục.

### 5. Solana seam audit

Trả lời: thêm `src/web3/solana/` mà không import EVM `Address` được không?
Application root mount thêm Solana provider được không? Có EVM lifecycle/type
nào trong `core/` không? Có public `useWallet`/`useTransaction` giả định
universal semantics không? Feature khai báo rõ family runtime không? Root
`src/web3` có tự động load mọi runtime không?

### 6. Exec plan lifecycle

Khi final audit pass:

```text
docs/plans/active/web3-foundation-domain-refactor.md
→ docs/plans/completed/web3-foundation-domain-refactor.md
```

Không tạo `docs/plans/web3-foundation-domain-refactor.md`.

---

## Final Audit

**Dependency**: foundation ✗ import feature; feature ✓ chỉ public EVM API;
application sở hữu provider composition; contracts registry application-owned;
`components/ui` không hiểu Web3; EVM components không chứa feature business
semantics. Search `@/web3/evm/`, `@/features/`, `writeContract`,
`sendTransaction`, `invalidateQueries` — kiểm tra ownership, không thay thế máy
móc.

**Public API**: liệt kê Tier A / Tier B / Internal / Testing-only / Removed /
Compatibility notes.

**Safety**: invariant matrix `Invariant | Decision owner | Implementation path |
Test path | Pass/fail`. Không claim invariant được bảo vệ nếu không có
implementation hoặc test evidence.

**Validation**: 5 command + `pnpm web3:smoke` nếu môi trường hỗ trợ. Không chạy
write testnet command trừ khi refactor chạm write script hoặc RPC/network config
đổi.

**Diff**: `git status --short`, `git diff --check`, `git diff --stat`,
`git diff`. Xác nhận không có unrelated formatting, registry data change ngoài
chủ đích, secret, generated artifact, dependency mới, deleted safety test,
temporary shim sót lại; documentation khớp implementation.

## Risks And Recovery

- **Phase 4 là rủi ro cao nhất.** Mitigation: di chuyển từng slice một, chạy
  targeted suite trước full baseline, không đổi tên + đổi behavior cùng lúc.
- **Deep import migration có thể tạo circular dependency** giữa `index.ts` và
  domain modules. Mitigation: domain `index.ts` không import root `index.ts`.
- **`core/address.utils` được auth dùng** — di chuyển có thể vỡ auth. Mitigation:
  export qua `@/web3/evm` trước, migrate import sau, chạy auth test suite riêng.
- **Recovery**: mỗi phase là một commit riêng trên branch làm việc. Rollback =
  revert commit của phase đó; repository luôn buildable ở ranh giới phase.
- **Baseline drift**: nếu một command fail ở phase sau, so với baseline
  2026-08-05 ở trên để phân biệt regression vs pre-existing.
- **`vi.mock()` string không bị ESLint kiểm soát.** 13 chỗ trong test vẫn trỏ
  vào deep path (`@/web3/evm/selection/use-evm-selection`,
  `@/web3/evm/hooks/*`). Chúng không phải import statement nên rule không thấy.
  Hiện chấp nhận được vì chúng mock đúng module mà code under test dùng qua
  barrel. Phase 3/4 khi các module này đổi path **sẽ làm vỡ mock trong im lặng**
  — phải cập nhật chuỗi mock cùng lúc với mỗi lần `git mv`.
- **Bất kỳ module pure nào import runtime barrel đều tái lập lỗi setup-graph.**
  Khi thêm consumer mới cho address/error helper, dùng leaf path
  `@/web3/evm/address` | `@/web3/evm/errors`, không dùng `@/web3/evm`.
- **`pnpm test:run -- <path>` KHÔNG filter** (chạy cả 48 file). Dùng
  `pnpm exec vitest run <path>` cho targeted run ở Phase 3/4.

## Phase 2 — Kết quả thực thi (2026-08-05)

### Changed files

```text
NEW  src/web3/evm/index.ts            public boundary Tier A + Tier B
NEW  src/web3/evm/address/index.ts    pure leaf entrypoint
MOD  src/web3/evm/errors.ts           re-export isUserRejectedWalletRequest
MOD  eslint.config.mjs                4 boundary rule groups
MOD  36 file application/feature      deep import → public path
MOD  docs/foundation/EXTENSION_CONTRACT.md  mục 3 viết lại
```

### Finding kiến trúc: barrel kéo runtime vào pure module graph

Sau khi migrate imports, 12 test file fail (148 test). Nguyên nhân **không phải**
test:

```text
src/test/setup.ts → @/mocks/server → handlers → features/auth/domain/*
→ @/web3/evm (barrel) → evm-provider → config.ts → wagmi.createConfig
```

Pure domain (`wallet-binding.ts`, `siwe-message.ts`, `auth-error.ts` — chỉ cần
address helper và một predicate) bị buộc instantiate toàn bộ EVM runtime. Hệ quả
trong test: real `use-evm-selection` được nạp trong setup graph trước khi
`vi.mock` của từng test file kịp áp dụng, nên module cache giữ instance thật.

Đây là vấn đề thiết kế thật, không riêng test: một barrel export cả provider
buộc mọi consumer của bất kỳ hook nào cũng phải dựng wagmi config tại import
time.

**Giải pháp** — public surface không phải một barrel duy nhất:

```text
@/web3/evm            runtime API (hooks, types, selectors)
@/web3/evm/address    pure, React-free, wagmi-free
@/web3/evm/errors     pure, React-free, wagmi-free
@/web3/web3-providers provider composition
```

`EvmProvider` bị loại khỏi `@/web3/evm`. Nó vốn đã được compose tại
`@/web3/web3-providers`, đúng chỗ application chọn family runtime — nên đây là
boundary rõ hơn, không phải nhượng bộ.

Sau sửa: 491/491 test pass, khớp chính xác baseline.

### ESLint boundaries

4 rule group, đã negative-test bằng probe file (cả 4 fire, public path không báo
lỗi):

```text
src/web3/**             ✗ @/features/**, @/app/**, @/contracts/**
application + feature   ✗ @/web3/evm/**, @/web3/core/** (trừ 3 public path)
UI layer                ✗ wagmi useWriteContract, useSendTransaction
pending-receipt-reconciler.tsx  override tạm thời, xóa ở Phase 5
```

Feature hook **được** gọi write hook của Wagmi cho contract của chính nó theo
`0015`; ràng buộc "phải qua lifecycle guard" do test + review policy bảo vệ.

### Provider composition

Không đổi. `src/app/providers.tsx` giữ nguyên thứ tự 8 provider; chỉ sửa 1 dòng
import (`Web3Providers` từ `@/web3/web3-providers`). Quyết định: **giữ**
`web3-providers.tsx`.

### Commands

```text
pnpm typecheck:    PASS
pnpm lint:         PASS
pnpm format:check: PASS
pnpm test:run:     PASS (48 files, 491 tests — khớp baseline)
pnpm build:        PASS (6/6 static pages, route output khớp baseline)
```

### Pre-existing flake — `use-siwe-login.test.tsx`

Trong full-suite run, file này thỉnh thoảng fail 1 test (test khác nhau giữa các
lần: `distinguishes verify unavailability from rejection`,
`signs in and binds the session to the signing address`). Isolated run
`pnpm exec vitest run src/features/auth/hooks/use-siwe-login.test.tsx` pass
15/15 liên tiếp 3 lần.

Đã kiểm chứng trên **pristine tree** (stash toàn bộ thay đổi Phase 2): 3 lần
full-suite → 2 pass, 1 fail cùng file. Kết luận: **pre-existing flake, không
phải regression của Phase 2**.

Chưa điều tra nguyên nhân (ngoài scope refactor). Nghi ngờ: race giữa MSW
handler reset trong `afterEach` và async state update của `useSiweLogin`. Ghi
lại để Phase 5 hoặc một work item riêng xử lý — không được dùng flake này để
che regression thật ở Phase 3/4: khi một test fail, chạy isolated + so pristine
trước khi kết luận.

### Audit Gate 2

- [x] Public API rõ hai tier, có document contract.
- [x] Không còn deep import từ application/feature (trừ 1 file có override ghi
      nhận, và các `vi.mock()` string — xem Risks).
- [x] ESLint enforce dependency direction, đã negative-test.
- [x] Provider composition không đổi behavior.
- [x] Không có duplicate QueryClient hoặc nested provider mới.
- [x] Validation không regression.
- [x] Temporary shim đã liệt kê ở Phase 5.

## Progress

- [x] Phase 1 — baseline + observed architecture + deep import inventory
- [ ] Phase 1 — mapping chi tiết per-file (hoàn tất khi vào từng phase)
- [x] Phase 2 — public API hai tier, ESLint boundary, provider verification
- [ ] Phase 3 — chain, reads, errors, `core/` audit
- [ ] Phase 4 — transaction slices, components, safety matrix
- [ ] Phase 5 — staking boundary, cleanup, final audit

## Decisions

- 2026-08-05: Thứ tự ưu tiên là `foundation authority → implementation → tests →
execution plan`. Plan cũ mâu thuẫn authority nên được sửa tại chỗ, không thực
  thi nguyên trạng.
- 2026-08-05: `useEvmWriteLifecycle` là **intentional feature-extension API**
  (Tier B), không phải private implementation và không phải write shortcut. Căn
  cứ: `0015` Enforcement chỉ định nó owns shared mechanical write safety; đọc
  implementation cho thấy nó chỉ chứa refs + guard throws, không có
  `writeContract`/`sendTransaction`; ẩn nó đi buộc staking nhân bản guard (làm
  yếu invariant) hoặc tạo generic abstraction (`0015` cấm).
- 2026-08-05: Public API chia hai tier — Tier A (Application) và Tier B (Feature
  Extension), Tier B kèm contract ràng buộc rõ.
- 2026-08-05: `src/app/providers.tsx` đã đúng; giữ nguyên thứ tự provider. Mặc
  định **giữ** `web3-providers.tsx` như adapter mỏng.
- 2026-08-05: `TransactionFeedbackProvider` ở lại application-owned location,
  không vào `web3/evm/components/`.
- 2026-08-05: Phase 5 chỉ chuẩn hóa `features/staking`; **không** refactor
  `features/auth`.
- 2026-08-05: `web3/core/` có work item audit riêng ở Phase 3 với bảng phân loại
  bắt buộc.
- 2026-08-05: Authority được cập nhật trong cùng phase làm đổi responsibility,
  không dồn sang Phase 5. `0014` cập nhật ở Phase 4.
- 2026-08-05: Bổ sung `0002`, `0003`, `0013` vào danh sách decision cần đọc.
- 2026-08-05 (**đã duyệt**): ESLint không cấm `useWriteContract` /
  `useSendTransaction` trong toàn bộ `features/**`, vì `0015` cho phép feature
  hook tự phát lệnh write cho contract của nó — pattern tại
  `use-staking-write.ts:68` giống hệt `use-send-evm-token.ts:85` trong
  foundation. Rule thay thế: cấm ở `features/**/components/**` và
  `src/components/**` (UI layer), cho phép ở `features/**/hooks/**`. Guarantee
  "không bypass lifecycle" dựa vào test + review policy theo `0015` Enforcement.

## Validation

- Focused proof: targeted `pnpm test:run -- <domain path>` sau mỗi lần di
  chuyển domain (Phase 3, 4).
- Integration proof: `src/components/web3/web3-lab.test.tsx`,
  `src/features/auth/auth-flow.integration.test.tsx`, staking hook tests.
- Repository-required checks: `pnpm typecheck`, `pnpm lint`,
  `pnpm format:check`, `pnpm test:run`, `pnpm build`, `git diff --check`.
- Baseline 2026-08-05 ghi ở Phase 1 là mốc so sánh regression.

## Result

Chưa hoàn tất. Phase 1 đã xong phần baseline và observed architecture.
