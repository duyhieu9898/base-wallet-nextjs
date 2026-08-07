# Package Scope — Evidence Base và Standing Verdicts

**Đây không phải authority document và không phải plan.** Nó lưu trữ các verdict "chưa tạo package nào" còn hiệu lực.

Authority vẫn là `ARCHITECTURE.md`, `CAPABILITIES.md`, `EXTENSION_CONTRACT.md` và `decisions/`. Kế hoạch thi công nằm ở [foundation-multi-app-execution.md](../plans/active/foundation-multi-app-execution.md).

## Trạng thái kiến trúc

Workspace monorepo bao gồm **6 applications** (3 product + 3 admin). Kế hoạch thi công và phân định package quy định tại [foundation-multi-app-execution.md](../plans/active/foundation-multi-app-execution.md).

---

## 1. Xung đột authority — đã xử lý (execution plan §4.6)

`docs/product/nln-feature-source-map.md` là **application document**. Nó **từng** tuyên bố ba "Decision" thay đổi foundation policy:

| Tuyên bố trong source map                                                         | Foundation authority hiện hành                                                                                                                                                      | Kết luận              |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `@nln/transaction-planner` — "Automated allowance checking to bypass approval"    | `0015`: "Approval and the primary transaction are distinct user-authorized steps"; "does not automatically approve and then submit a primary action in one opaque user interaction" | **Vi phạm invariant** |
| `@nln/transaction-planner` — "transaction execution graph" nhận mọi contract call | `CAPABILITIES.md` non-goal: "trở thành universal transaction engine"; `0015` Boundaries: không có `useTransaction` nhận arbitrary ABI                                               | **Vi phạm non-goal**  |
| `@nln/transaction-planner` — "Nonce management"                                   | `0008` Boundaries: "Nonce replacement/cancel không thuộc baseline"                                                                                                                  | **Vi phạm boundary**  |

Theo `EXTENSION_CONTRACT.md` §10 và `README.md` "Change policy", một application/product document không đặt được foundation policy.

**Trạng thái:** đã xử lý. Cả ba "Decision" trong source map §4 đã hạ xuống _Candidate_ kèm promote trigger đo được; ba mục vi phạm ở bảng trên đã bị xóa khỏi scope và ghi lại thành khối "Out of scope — do not implement" trỏ về đúng authority cấm chúng. Bảng ma trận §2, roadmap §5 và `AGENTS.md` đã sửa cho khớp — trước đó chúng vẫn gọi `@nln/transaction-planner` và `@nln/rpc-observability` là "Core", mâu thuẫn với chính verdict ở §6 dưới đây.

---

## 2. Current Architecture & Boundary Truth

### 2.1. Repository và package structure

| Thành phần            | Trạng thái monorepo hiện hành                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Cấu trúc Monorepo     | Workspace monorepo (`nln-platform`, `pnpm-workspace.yaml` khai báo `packages/*`, `apps/*`)                                   |
| Số application target | **6 applications** (3 product: `n-plus`, `neura`, `neura-link` + 3 admin: `n-plus-admin`, `neura-admin`, `neura-link-admin`) |
| Workspace packages    | **2 packages** (`packages/web3-evm` cho EVM apps, `packages/web3-solana` cho Solana apps)                                    |
| Framework chuẩn       | Next.js App Router cho cả 6 applications                                                                                     |
| Root repository       | Chỉ chứa tooling chung (`prettier`, `eslint`, `husky`, `lint-staged`, `typescript`, `tsx`)                                   |

### 2.2. Public API

`src/web3/evm/index.ts` là barrel duy nhất, chia hai tier đúng như `EXTENSION_CONTRACT.md` §3.2:

- **Tier A**: `useEvmSelection`, `useEvmWallet`, `useEvmNetwork`, 4 read hook balances, 2 read hook allowances, 3 write hook (`useSendEvmNative`, `useSendEvmToken`, `useApproveEvmToken`), fee/receipt/history hooks, domain types, registry selectors, address helpers, 9 reusable component, `PendingReceiptReconciler`.
- **Tier B**: `useEvmWriteLifecycle`, `assertEvmWriteReady`, `deriveEvmWriteStatus`, error taxonomy, `isUserRejectedWalletRequest`, history storage writers, `buildEvmWriteInvalidationFilters`, strict registry selectors.

`EvmProvider` **cố ý không** nằm trong barrel; composition đi qua `@/web3/web3-providers`.

ESLint đã enforce hai chiều:

- `src/web3/**` không được import `@/features`, `@/app`, `@/contracts`;
- `src/{features,components,app,providers,contracts,lib,hooks,mocks}/**` chỉ được import 3 public path (`@/web3/evm`, `@/web3/evm/address`, `@/web3/evm/errors`);
- UI layer bị chặn import `useWriteContract`/`useSendTransaction` từ `wagmi`.

Điểm quan trọng: **boundary đã tồn tại và đã được máy kiểm tra**. Phần lớn giá trị mà một package extraction thường mang lại đã được thu về rồi — đó là lý do extraction là bước cơ học chứ không phải refactor.

### 2.3. Import coupling — bốn khoản nợ chặn extraction

**Trạng thái:** các khoản nợ import coupling đã được trả hoàn toàn. Nguyên văn ghi lại vì nó giải thích lý do boundary phải được đóng trước khi chuyển file package.

1. **Foundation components → application UI + i18n.** 8 file dưới `src/web3/evm/components/**` import `@/components/ui/{button,card,input,label}`, `@/i18n/use-translation`, và `@/components/web3/common/stage-badge`, `@/components/web3/common/transaction-feedback`. Chiều phụ thuộc này ngược với `EXTENSION_CONTRACT.md` §11 nhưng ESLint hiện không chặn.
2. **Registry → application config.** `evm-registry.adapter.ts:1` và `evm-network.registry.ts:4` import `@/config/web3.config`. Foundation đang **đọc application config trực tiếp** thay vì nhận injection.
3. **Env name hardcode trong foundation.** `evm-network.registry.ts:139-143` đọc `NEXT_PUBLIC_RPC_ETHEREUM_SEPOLIA` và `NEXT_PUBLIC_RPC_ETHEREUM_MAINNET` theo tên cố định — không tái dùng được cho app có network khác mà không sửa foundation.
4. **Provider init side effect ở module load.** `wagmi-config.adapter.ts` kết thúc bằng `export const wagmiConfig = createWagmiConfigFromRegistry()`. Import module này là dựng wagmi config ngay. Factory đã tách sẵn nên đây là khoản nợ rẻ nhất.

Ngoài ra có một **leak định danh feature vào foundation**: `evm-transaction-history.ts:44` định nghĩa `StakingHistoryItem` và đưa vào union `EvmTransactionHistoryItem`; barrel re-export ở Tier B. Foundation không được "biết staking" (`EXTENSION_CONTRACT.md` §11). Đây là chứng cứ rõ nhất rằng sức ép từ feature đầu tiên đã bẻ cong boundary — lý do phải **đóng boundary trước**, không phải chuyển file trước.

### 2.4. Provider composition

```text
app/providers.tsx → QueryProvider → Web3Providers → EvmProvider(WagmiProvider) → auth runtime
```

`Web3Providers` là composition point duy nhất, mount đúng một family runtime. Auth compose _bên ngoài_ Web3Providers.

### 2.5. Registry/config ownership

- `EVM_NETWORKS`: Sepolia (11155111) + Mainnet (1).
- Default chain: `NEXT_PUBLIC_DEFAULT_CHAIN_ID`, fallback Sepolia.
- Feature contract registry (`0016`) **đã tồn tại**: `src/contracts/registry/deployments.json` — chain `1` rỗng, chain `11155111` có đúng một entry `staking-vault` → `TestStakingVault`, `version: "test-v1"`.

### 2.6. Implemented vs planned

| Domain               | Planned (source map) | Specified (local-docs) | Implemented (src/)                |
| -------------------- | -------------------- | ---------------------- | --------------------------------- |
| Wallet + SIWE auth   | N+, Neura Link       | A020100                | ✅ `features/auth/` (MSW backend) |
| Staking              | N+, Neura Link       | B020101–B020106 (UI)   | ⚠️ demo vault Sepolia, test ABI   |
| Lending              | N+                   | B020201–B020205 (UI)   | ❌                                |
| Membership NFT       | Neura Link           | A040100–A040300 (UI)   | ❌                                |
| MLM tree/rank/reward | N+, Neura Link       | B030100–B030400 (UI)   | ❌                                |
| Admin portal         | N+, Neura Link       | C010100–C080100        | ❌                                |

Screen design specs là **màn hình**, không phải contract specs. Không file nào trong `docs/local-docs/` cung cấp ABI, spender policy, approval amount policy, hay địa chỉ deployment cho contract nào ngoài staking vault test.

---

## 3. Consumer-evidence matrix

Thang: `Planned` = có tên trong source map · `Specified` = có screen/business spec · `Implemented` = có code chạy được · `Duplicated` = đã tồn tại ≥2 implementation thật.

| Candidate abstraction       | N+             | Neura Link     | Implemented consumer                               | Shared invariant proven?  |
| --------------------------- | -------------- | -------------- | -------------------------------------------------- | ------------------------- |
| EVM runtime (`web3-evm`)    | Planned        | Planned        | **1** — app hiện tại (auth + staking + web3-lab)   | ✅ Có, nhưng 1 consumer   |
| Wallet + SIWE auth          | Specified      | Specified      | **1** — `features/auth/`                           | ⚠️ Chưa có consumer thứ 2 |
| Transaction plan / approval | Planned        | Planned        | **1** — `features/staking/hooks/use-staking-write` | ❌ Chưa (xem §4)          |
| RPC transport factory       | Planned        | Planned        | **1** — `wagmi-config.adapter.ts`                  | ⚠️ Injection chưa mở      |
| RPC fallback                | Planned        | Planned        | **0**                                              | ❌                        |
| Observability / telemetry   | Planned        | Planned        | **0**                                              | ❌                        |
| Staking SDK                 | Planned        | Planned        | **1** demo, test ABI                               | ❌                        |
| Lending                     | Specified (UI) | —              | **0**                                              | ❌                        |
| Membership NFT              | —              | Specified (UI) | **0**                                              | ❌                        |
| MLM tree / rank / reward    | Specified (UI) | Specified (UI) | **0**                                              | ❌                        |
| UI primitives               | Planned        | Planned        | **1** — 4 shadcn primitive                         | ❌                        |

**Không dòng nào đạt `Duplicated`.** Không candidate nào có consumer thứ hai đã implement. Điều kiện promote của `EXTENSION_CONTRACT.md` §5 không được thỏa mãn ở bất kỳ dòng nào.

Ma trận này là công cụ trả lời câu "sao chưa tách package X?" — cập nhật nó khi có consumer mới, đừng viết lại từ đầu.

---

## 4. Transaction plan / approval orchestration — DEFER

**Giữ feature-local. Chỉ thiết kế boundary, chờ contract specs.**

| Câu hỏi                          | Trả lời từ repository                                                                                                                                                                                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hiện implement hay chưa?         | Chưa. `0015` ghi rõ `useApprovalRequirement`/`useApprovalThenWriteFlow` **not implemented**.                                                                                                                                                                                                |
| Feature-local hay shared?        | **Feature-local**. Một consumer duy nhất: `use-staking-write.ts`.                                                                                                                                                                                                                           |
| Required specs trước khi bàn lại | Contract ABI thật (không phải `TestStakingVault test-v1`); spender policy; approval amount policy; receipt behavior sau approval; sequencing invariant từng flow.                                                                                                                           |
| Two-consumer threshold           | Cần **≥2 feature consumer đã implement** có cùng approval preflight và cùng UX hai bước. Membership-purchase và staking _có thể_ giống nhau — nhưng cả hai chưa có contract, nên chưa chứng minh được.                                                                                      |
| Safety invariants phải giữ       | Approval và primary transaction là hai authorization riêng, review riêng, wallet prompt riêng; primary bị khóa tới khi **approval receipt** chứng minh success — hash không đủ; duplicate-submit guard; stale-operation isolation; receipt là terminal evidence; side effect once-per-hash. |
| Forbidden generic APIs           | `useTransaction(arbitraryAbi, fn, callbacks)`; auto-approve-then-submit trong một tương tác; "execution graph" nhận mọi contract call; nonce management/replacement; giả định mọi ERC-20/NFT action đều cần approval.                                                                       |

Về luận cứ "cả ba flow đều là `approve → primary`": đó là **hình dạng**, không phải invariant. Membership upgrade có state trước đó (tier hiện tại), lending có health factor và collateral, staking có lock duration. Gộp sớm chính là điều `EXTENSION_CONTRACT.md` §5.4 cấm — "abstraction không được che mất contract/domain differences".

Đường đi khi có specs: pilot **feature-local lần thứ hai** viết độc lập, rồi so sánh hai implementation. Duplication thật xuất hiện ở đâu thì promote đúng chỗ đó. Execution plan §7 là kế hoạch cho đúng việc này.

---

## 5. RPC và observability

### 5.1. Transport factory — trong EVM package, không phải package riêng

- Ownership: `wagmi-config.adapter.ts` giữ nguyên chỗ.
- Việc cần làm: `buildTransports` nhận rpc url từ injected config thay vì đọc env theo tên hardcode; `wagmiConfig` chuyển từ module-level const sang tạo trong provider.
- Không tạo package: có đúng một consumer.

### 5.2. Fallback policy — DEFER

`CAPABILITIES.md` liệt kê sáu điều kiện còn thiếu: provider ownership, failover policy, retry budget, rate-limit semantics, observability, consistency requirements. Không điều nào được quyết định thêm. Trước khi có provider vendor thật và số liệu tải thật, `viem` `fallback()` transport là câu trả lời config-level, không cần abstraction riêng.

Không được làm tạm: fallback im lặng che read failure — vi phạm "No fake fallback" (`ARCHITECTURE.md` §2).

**Ghi nhận thêm:** RPC mặc định hiện là public endpoint (`11155111.rpc.thirdweb.com`, `ethereum.reth.rs/rpc`). `0001` cấm coi public RPC default là production provider strategy. Phải thay trước khi app đầu tiên lên staging.

### 5.3. Diagnostics — boundary nội bộ, không package riêng

- Ownership: application. `0017` đã chỉ định `reportError` boundary với allowlisted context schema + explicit redaction policy **trước** khi có vendor adapter.
- Redaction bắt buộc: không log access token, refresh token, signature, raw RPC payload, raw request/response body, `ApiError.details`, `cause`.
- Package riêng: **REJECT** — 0 consumer.

### 5.4. Non-goals

- Không vendor adapter (Sentry/Datadog) trước khi có production deployment thật.
- Không global error boundary / browser-global handler (`0017` Boundaries).
- Không gộp `AuthError` và `EvmWeb3Error` thành một union.
- Không nonce management/replacement.
- Không time-to-mempool telemetry trước khi có event schema ổn định.

---

## 6. Standing verdicts — chưa tạo package nào sau đây

Đây là phần được hỏi lại nhiều nhất. Mỗi dòng có evidence ở §3.

| Proposed package           | Verdict      | Evidence / Role                                                                                                                                                                   |
| -------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@nln/web3-evm`            | **Accepted** | Foundation package cho EVM apps (`n-plus`, `neura-link`).                                                                                                                         |
| `@nln/web3-solana`         | **Accepted** | Sibling foundation package cho Solana apps (`neura`, `neura-admin`).                                                                                                              |
| `@nln/staking-sdk`         | **REJECT**   | Cả N+ và Neura Link đều chưa có ABI, chưa có địa chỉ. Deployment duy nhất là `TestStakingVault test-v1`. Chia sẻ theo tên "staking" là điều `EXTENSION_CONTRACT.md` §5 cấm thẳng. |
| `@nln/mlm-sdk`             | **REJECT**   | 0 dòng code MLM trong `src/`. Tree traversal + rank calculation là indexer/backend domain. Chưa có contract, chưa có API contract, chưa có consumer.                              |
| `@nln/rpc-observability`   | **REJECT**   | `grep -rln "reportError\|observability" src/` → 0 hit. `0017`: reporter chỉ thêm khi có production observability requirement.                                                     |
| `@nln/ui-components`       | **DEFER**    | `src/components/ui/` có 4 primitive shadcn-generated. Không duplication thật, không consumer thứ hai.                                                                             |
| `@nln/transaction-planner` | **DEFER**    | Xem §4. Một consumer.                                                                                                                                                             |
| Shared config packages     | **DEFER**    | `tsconfig.json`, `eslint.config.mjs` phục vụ đúng một app. Extract trước khi có app thứ hai là tooling cost không đổi lấy gì.                                                     |

Khi ai đó đề xuất một trong số này, câu hỏi đầu tiên là: **consumer thứ hai đã implement chưa?** — không phải "có hợp lý không".

---

## 7. Validation baseline

Danh sách kiểm tra tự động:

| Command             | Kết quả  | Ghi chú                                                                                          |
| ------------------- | -------- | ------------------------------------------------------------------------------------------------ |
| `pnpm typecheck`    | **PASS** | exit 0                                                                                           |
| `pnpm lint`         | **PASS** | exit 0                                                                                           |
| `pnpm format:check` | **PASS** | exit 0                                                                                           |
| `pnpm test:run`     | **PASS** | 55 file, 527 test, 43.02s                                                                        |
| `pnpm build`        | **PASS** | Next 16.2.12 Turbopack, 4 route, 6 static page                                                   |
| `pnpm web3:smoke`   | **PASS** | 2/2 network · 3 token · 3 balance · 3 allowance · Sepolia block 11428904, Mainnet block 25693434 |

`web3:smoke` được chạy sau bản review gốc (bản gốc ghi NOT RUN). Đây là live read baseline để đối chiếu khi Track 0 đổi registry và RPC handling.

Local testnet write: **NOT RUN** — cần funded wallet.
