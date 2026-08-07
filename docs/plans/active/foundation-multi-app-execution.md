# Foundation Multi-App Execution Plan

Kế hoạch thi công cho monorepo `nln-platform`, target 6 application (3 product + 3 admin) trên các foundation package.

> **Target 6 Application:** Monorepo bao gồm **N+ System** (`apps/n-plus` & `apps/n-plus-admin`), **Neura System** (`apps/neura` & `apps/neura-admin`), và **Neura Link System** (`apps/neura-link` & `apps/neura-link-admin`), mỗi product system có admin app riêng. `apps/n-plus` — app duy nhất đang tồn tại — nội dung của nó (SIWE auth, staking demo, web3-lab) là reference application của foundation, và N+ có staking NRA⇄USDT nên nó là điểm khởi đầu thật.

**Capacity:** 3 người. 4 workstream có thể overlap, nhưng **tối đa 3 workstream chạy thật cùng lúc** (§9).

Bằng chứng đo được và các verdict "chưa tạo package nào" nằm ở [package-scope-evidence.md](../../foundation/package-scope-evidence.md). File này không lặp lại phần đó — khi cần trả lời "sao chưa tách package X?", đọc bên kia.

## 1. Quyết định đã chốt

| Hạng mục           | Quyết định                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| Distribution model | **pnpm workspace monorepo**. Foundation là workspace package, không publish                    |
| Source separation  | Chung một source. Hiện **không có** yêu cầu source/access isolation (§1.2)                     |
| Git history        | Không bảo toàn history riêng của template `shadcn-admin` khi import — một commit import cơ học |
| App hiện tại       | Thành một app trong workspace. **Không xóa code nào**, giữ cả `web3-lab` và staking demo       |
| Auth               | Product SIWE và admin auth là **hai candidate riêng**, promote độc lập (§6.4)                  |
| Số application     | **3 product + 3 admin = 6**, mỗi product một admin riêng (§2)                                  |
| Framework          | **Next.js cho cả 6**. Template UI Vite/shadcn của `shadcn-admin` viết lại routing layer (§2.2) |

### 1.1. Vì sao workspace thay vì publish package

Foundation còn churn mạnh và có 4 track song song. Vòng lặp `sửa package → build → tag → nâng version ở N repo → validate` tốn hơn giá trị nó mang lại ở giai đoạn này.

Workspace bỏ được toàn bộ chỗ đó: một PR sửa foundation + consumer + chạy test toàn bộ. Package boundary vẫn thật, nên tách repo sau này vẫn dễ.

Nhiều app càng làm lựa chọn này đúng hơn, không sai đi: shared foundation package (`@nln/web3-evm` cho các EVM app) giúp không phải nâng version ở nhiều nơi mỗi lần sửa foundation. Hai rủi ro phải quản lý và đã có chỗ xử lý trong plan: CI nặng hơn → mỗi app build/filter độc lập (§5.5, §10.1); quyền truy cập source giữa các khách hàng → tách repo + versioned package (§1.2).

### 1.2. Source separation — phạm vi và giới hạn

Hiện chưa có yêu cầu source isolation. Khi cần, phân biệt hai trường hợp khác nhau hẳn:

| Nhu cầu                                                  | Cách xử lý                                                                          |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Snapshot bàn giao** — giao source một app cho bên khác | Clone + xóa path không liên quan, hoặc export script tạo repo sạch từ selected path |
| **Access isolation / phát triển độc lập**                | Tách app thành repository riêng; `@nln/web3-evm` chuyển thành versioned package     |

Clone + xóa **chỉ giải quyết vế thứ nhất**. Nó không xử lý: history vẫn chứa toàn bộ code các app khác, commit metadata, secrets từng commit, phân quyền, đồng bộ về sau. Nếu hợp đồng yêu cầu source separation thật thì phải đi đường thứ hai — ghi ở đây để lúc đó không nhầm là việc nhỏ.

### 1.3. Foundation "framework-agnostic" nghĩa là gì

Chính xác thì foundation **không** agnostic theo nghĩa tổng quát. Nó phụ thuộc React, Wagmi React, TanStack React Query, browser wallet behavior, và `"use client"` ở nhiều module.

```text
Foundation là React-based EVM package, host được bởi Next.js hoặc bởi
React host khác, sau khi application config, SSR behavior và presentation
coupling được tách ra.
```

Điều đúng và đo được là: foundation có **zero import từ `next`**. Giữ được tính chất này là có giá trị — nó là thứ cho phép đổi host về sau — nhưng §2.2 đã chốt cả 6 app dùng Next, nên hiện **không có consumer non-Next nào**. Không thiết kế thêm gì cho host giả định.

---

## 2. Kiến trúc đích

**Target: 3 product app + 3 admin app = 6 application độc lập.** Mỗi product có admin riêng, không dùng chung một admin.

```text
nln-platform/
├── apps/
│   ├── n-plus/                ← N+ Product App
│   ├── n-plus-admin/          ← N+ Admin App
│   ├── neura/                 ← Neura Product App (Solana)
│   ├── neura-admin/           ← Neura Admin App
│   ├── neura-link/            ← Neura Link Product App
│   └── neura-link-admin/      ← Neura Link Admin App
├── packages/
│   └── web3-evm/              ← dùng chung cho các EVM app
├── docs/foundation/           ← authority dùng chung
├── pnpm-workspace.yaml
└── package.json               ← CHỈ tooling, không chứa dependency của app
```

Các EVM app dùng chung `@nln/web3-evm` (Neura System sẽ tạo `@nln/web3-solana` khi khởi chạy, xem [`CAPABILITIES.md`](../../foundation/CAPABILITIES.md)). Mỗi app **sở hữu độc lập**: runtime config · supported networks/tokens · RPC environment · contract deployment data · authentication policy · authorization/RBAC · feature module · product UI · business history · deployment pipeline.

### 2.1. Target architecture ≠ execution timing

Chỉ scaffold cặp đang bắt đầu thật. Skeleton trống là thứ phải bảo trì trước khi ai viết dòng feature nào trong đó, và workspace làm việc thêm app sau này rẻ.

```text
Bây giờ              apps/n-plus  ·  apps/n-plus-admin
Neura bắt đầu        → thêm apps/neura  ·  apps/neura-admin (kèm @nln/web3-solana)
Neura Link bắt đầu   → thêm apps/neura-link  ·  apps/neura-link-admin
```

Con số 6 nằm trong kiến trúc để naming, ESLint boundary, validation filter và deploy isolation thiết kế đúng ngay từ đầu — không phải để tạo trước.

### 2.2. Framework — Next.js cho cả 6

**Quyết định:** cả 3 product và cả 3 admin dùng Next.js. Không để mỗi admin tự chọn.

Chi phí đã biết và chấp nhận: template UI admin (`shadcn-admin`, nguồn copy template build UI admin) là Vite 8 + TanStack Router file-based (`src/routes/`, `routeTree.gen.ts`). Routing layer phải viết lại sang Next.js App Router; `components/`, `features/`, `styles/`, `lib/` giữ lại và copy sang các admin app (`apps/*-admin`). Trả một lần ở admin đầu tiên.

Đổi lại: một chuẩn duy nhất cho folder structure, auth, routing, environment, testing, deployment, onboarding — và không copy feature giữa product ↔ admin vì khác đối tượng, khác session/permission model và khác business logic.

### 2.3. Dependency direction

```text
apps/*      → packages/web3-evm
packages/*  ↛ apps/*
app A       ↛ app B          (gồm cả admin A ↛ admin B)
product app ↛ admin app tương ứng
feature A   ↛ feature B
```

`product ↛ admin` là rule dễ bị phá nhất: `n-plus` và `n-plus-admin` cùng domain, cùng contract, và nằm cạnh nhau trong `apps/` — import chéo trông rất hợp lý lúc viết. Nó không hợp lý: hai app có deployment và permission model khác nhau, một import chéo là admin code lọt vào bundle public.

Các rule **phải được ESLint enforce**, không phải quy ước. Ở nhiều repo `apps/a → apps/b` bất khả thi về vật lý; trong workspace thì `../../n-plus-admin/src/features/x` resolve được thật. Monorepo lần đầu tiên làm anti-pattern này khả thi, nên phải chặn bằng máy.

---

## 3. Dependency isolation — app cài package không làm phình foundation

Đo được từ source hiện tại: foundation chỉ import **4 npm package**.

```text
viem                  52 lần
react                 24
wagmi                 21
@tanstack/react-query 12
lucide-react           3   ← chỉ ở 3 file mà §4.3 gỡ đi
```

`lucide-react` nằm đúng ở `status-badge`, `transaction-review-card`, `transaction-status` — ba file chuyển presentation ra app. Sau Track 0, foundation không còn dependency icon.

### 3.1. Manifest đích

```jsonc
// packages/web3-evm/package.json
{
  "name": "@nln/web3-evm",
  "private": true,
  "sideEffects": false,
  "exports": {
    ".": "./src/index.ts",
    "./address": "./src/address/index.ts",
    "./errors": "./src/errors/index.ts",
    "./errors/adapter": "./src/errors/adapter/index.ts",
    "./contracts": "./src/contracts/index.ts",
    "./config": "./src/config/index.ts",
    "./provider": "./src/provider/index.ts",
  },
  "dependencies": {}, // hiện trống — xem luật 1
  "peerDependencies": {
    "react": "^19",
    "wagmi": "^3",
    "viem": "^2",
    "@tanstack/react-query": "^5",
  },
}
```

Ba subpath phát sinh ngoài dự kiến ban đầu, mỗi cái có lý do đo được:

| Subpath            | Vì sao                                                                                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `./config`         | Consumer dựng và install `EvmRuntimeConfig`. React-free/wagmi-free là bắt buộc: import barrel trong `test/setup.ts` nạp sớm hook module và vô hiệu hoá `vi.mock` |
| `./errors/adapter` | Tách pure error taxonomy khỏi adapter Viem/Wagmi — đúng acceptance criteria §5.4                                                                                 |
| `./contracts`      | Schema + validator của contract registry (`0016`); data ở app (§8.1)                                                                                             |

Subpath `./provider` là bắt buộc: `EvmProvider` cố ý nằm ngoài barrel chính, và composition root hiện tại (`src/web3/web3-providers.tsx`) ở ngoài `evm/` — Track 1 phải quyết nó thuộc package hay thuộc app.

`react-dom` **không** nằm trong peer: `git grep react-dom src/web3/` rỗng. Chỉ khai báo peer cho thứ thực sự import.

### 3.2. Luật giữ cho package không phình

1. Runtime mang React context (`react`, `wagmi`, `@tanstack/react-query`) **phải** là peerDependency — hai instance là hỏng im lặng, không phải lỗi build.
2. `viem` là peer vì public API expose Viem type và Wagmi ràng buộc version — lý do là type exposure + version sync, **không** phải React context.
3. App-only dependency bị cấm trong package. `dependencies` hiện trống và mỗi lần thêm phải nêu lý do trong PR — nhưng "luôn trống" không phải invariant vĩnh viễn: một pure runtime dependency (không context, không app-specific) là hợp lệ khi có lý do thật.
4. Mọi direct import phải được khai báo trong manifest của package.
5. **Không bao giờ cài dependency của app vào root** (`pnpm add -w`). Root chỉ chứa tooling. Đây là cách duy nhất phá được isolation.
6. Peer dependency phải có trong `devDependencies` của package để nó tự build và test được.

### 3.3. Vì sao chiều ngược lại là cơ chế, không phải kỷ luật

pnpm dùng **isolated node_modules**: một package chỉ import được thứ nó khai báo, không có phantom dependency như npm/yarn hoisting. Admin cài 50 package thì `web3-evm` **không thể** import chúng kể cả khi ai đó viết nhầm — resolve sẽ fail ngay.

Lưu ý: repo hiện tại đang bị đúng vấn đề này. `package.json` hôm nay gộp foundation chung với `solc` (trình biên dịch Solidity), `tsx`, `msw`, `playwright`, `shadcn`, `date-fns`, `react-hook-form`, `zod` — foundation không đụng cái nào. Workspace sửa bloat đang có, không chỉ phòng bloat tương lai.

### 3.4. Chiều foundation → bundle của app

Kiến trúc đã thiết kế sẵn: `EvmProvider` cố ý ngoài barrel, `/address` và `/errors` là hai pure leaf tách riêng. Biến thành phép đo thật ở §5.4.

---

## 4. Track 0 — Package-readiness (BLOCKING)

> **Trạng thái: HOÀN THÀNH.**
> Package `@nln/web3-evm` đã được tách biệt hoàn toàn khỏi application dependencies. Config injection, Wagmi initialization, UI/i18n decoupling và two-tier transaction history đã được thống nhất.

Tiêu chí nghiệm thu duy nhất:

```text
Consumer cấu hình được foundation
mà không sửa một dòng nào bên trong foundation
```

### 4.1. Config injection

`evm-network.registry.ts:139-143` hardcode `NEXT_PUBLIC_RPC_ETHEREUM_SEPOLIA`/`_MAINNET`; registry import `@/config/web3.config`. Admin dùng network và env name khác.

**Một representation duy nhất, chain-scoped.** `EvmNetworkConfig` (`evm-registry.types.ts:13`) hôm nay đã chứa `tokens` và `rpcUrlOverride`. Nếu runtime config thêm map `tokens` và `rpcUrls` song song thì có hai nguồn authority cho cùng một dữ liệu — sai lệch giữa chúng là bug im lặng, không phải type error.

```ts
export type EvmRuntimeConfig = {
  networks: readonly EvmNetworkConfig[] // chain · rpcUrlOverride · tokens · faucets
  defaultChainId: number
}

// ssr KHÔNG thuộc chain config — nó là option của React/Wagmi host
export type EvmProviderOptions = {
  ssr: boolean
}
```

```tsx
<EvmProvider runtimeConfig={evmRuntimeConfig} options={{ ssr: true }}>
```

Config injection vì thế **không cần type mới**: đổi từ registry đọc module-scope sang nhận `EvmNetworkConfig[]` từ consumer. Cấm giữ song song map token/RPC ở tầng runtime config. Nếu về sau thật sự cần map phẳng, phải xóa `tokens`/`rpcUrlOverride` khỏi network entry và runtime-validate mọi `chainId` khớp nhau — không giữ cả hai.

**`0001` đã hậu thuẫn bước này, không cản.** Decision đó viết sẵn: "Supported EVM network selection là configuration concern. Application adoption chọn network bằng cách giữ, thêm hoặc bỏ registry entries; foundation runtime không hardcode một production network" và "RPC URL được override qua environment, không hardcode trong component hoặc hook".

Nghĩa là **code hiện tại mới là thứ lệch khỏi `0001`**, không phải plan lệch khỏi `0001`. §4.1 là đưa code về đúng decision đã có — nhẹ hơn một decision change.

Chỗ duy nhất của `0001` phải sửa: dòng quy định token cấu hình tại `src/web3/evm/chain/registry/evm-tokens.json` — path nằm trong foundation, trong khi consumer mới là người cung cấp tokens.

`ssr` phải ra khỏi package vì `wagmi-config.adapter.ts:47` hardcode `ssr: true` — quyết định của application nằm bên trong package, đúng thứ tiêu chí nghiệm thu ở trên cấm. Nhưng nó **không thuộc `EvmRuntimeConfig`**: registry là metadata về chain, còn `ssr` là hosting concern của React/Wagmi. Trộn hai thứ làm chain config mang theo identity của framework.

**Ghi nhận trung thực:** §2.2 chốt cả 6 app dùng Next nên `ssr: true` đúng cho mọi consumer hiện tại — lý do "Vite SPA cần `false`" không còn hiệu lực. App template đặt `ssr: true` làm default; đây là dọn coupling, không phải phục vụ consumer giả định.

#### `web3:smoke` là consumer đầu tiên — sửa trong cùng commit (R1)

`scripts/web3-smoke.ts:61` gọi `await import("../src/web3/evm/chain/registry/evm-registry.adapter")` rồi lấy `allNetworks` từ đó. Đó **chính xác** là cơ chế module-scope mà bước này xóa → smoke vỡ ngay tại §4.1.

Không được để vỡ rồi sửa sau: §10 dựa vào smoke để đối chiếu before/after đúng lúc registry và RPC handling đổi. Mất smoke ở đây là mất công cụ kiểm chứng đúng lúc cần nhất.

**Xử lý:** smoke tự dựng `EvmRuntimeConfig` từ env và truyền vào — trở thành consumer đầu tiên chứng minh tiêu chí nghiệm thu ("cấu hình được mà không sửa dòng nào bên trong foundation"). Sửa cùng commit với §4.1, chạy lại và so với baseline §10.

### 4.2. Bỏ module-load Wagmi init

`export const wagmiConfig = createWagmiConfigFromRegistry()` → `createWagmiConfig(runtimeConfig)`, khởi tạo trong `EvmProvider`.

### 4.3. Xử lý toàn bộ UI/i18n coupling

| Nhóm                                                                                                  | Consumer           | Hành động                                                       |
| ----------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------- |
| BalanceCard, NetworkCard, UnsupportedNetworkCard, WalletCard, TransferSection, RecentTransactionsCard | chỉ `web3-lab.tsx` | Chuyển sang app                                                 |
| StatusBadge                                                                                           | không có           | Bỏ khỏi barrel                                                  |
| TransactionReviewCard, TransactionStatus                                                              | staking panels     | Foundation export **model/derivation**; app render presentation |

Foundation sau bước này export: hooks, domain state, types, pure models, state derivation. Không export presentation phụ thuộc design system.

Verify được: 6 component nhóm 1 chỉ có đúng một consumer là `web3-lab.tsx`; `StatusBadge` **không có consumer nào**; `TransactionReviewCard` và `TransactionStatus` chỉ dùng ở `staking-approval-panel.tsx` / `staking-action-panel.tsx`.

#### BLOCKER — `0014` cấm đúng thứ bước này làm (R11)

`0014-web3-component-organization.md` nói thẳng:

```text
Component hiểu trực tiếp EVM semantics thuộc về EVM runtime, không thuộc application:
src/web3/evm/components/   wallet, network, balance, history,
                           transaction forms, shared transaction presentation
```

§4.3 chuyển đúng những thứ đó ra app. **Làm mà không sửa `0014` là code vi phạm authority của chính repo** — người review sau sẽ đúng khi bảo revert, và ta mất công hai lần.

Phải quyết `0014` **trước khi gõ dòng đầu tiên của 4.3**, không phải sau:

| Decision | Sửa gì                                                                                                                                                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0014`   | Ranh giới đổi: foundation giữ hook / domain state / model / derivation; presentation phụ thuộc design system thuộc application. Ghi rõ lý do: consumer thứ hai (admin) không dùng chung design system với product app.          |
| `0011`   | Chỉ sửa **chủ ngữ**. "Foundation-provided transaction forms dùng flow `Prepare → Review → Confirm`" — sau 4.3 thì form do app cung cấp. **Flow giữ nguyên, không nới lỏng.** Foundation vẫn sở hữu derivation của review state. |

`0011` là chỗ dễ sai nhất trong cả Track 0: sửa chủ ngữ mà lỡ tay nới flow là làm yếu transaction safety. `Prepare → Review → Confirm` vẫn bắt buộc, và approval vẫn là authorization riêng với primary transaction (`0015`).

**Di chuyển hai lần là bình thường (R10).** Track 0 chưa có `apps/`, nên component ra `src/components/web3/`; Track 1 chuyển tiếp vào `apps/n-plus/`. Ghi ở đây để bước hai không bị hiểu là làm hụt.

### 4.4. Tách history hai tầng

`0012` dòng 54: item schema là **union đóng theo `action`**. Membership, lending và staking đều cần variant — ba feature đâm vào một union đóng cùng lúc là va chạm chắc chắn.

Không feature registry, không arbitrary metadata. App compose hai nguồn khi hiển thị.

#### Schema chốt trước khi code

Chưa chốt schema thì membership và lending sẽ tự nghĩ ra hai cách liên kết history khác nhau — đúng thứ §4.4 sinh ra để tránh.

```ts
// Foundation — mechanical record
export type EvmMechanicalTransactionRecord = BaseHistoryItem & {
  kind:
    "native-transfer" | "token-transfer" | "token-approval" | "contract-write"
}
// BaseHistoryItem giữ nguyên: hash · chainId · account · submittedAt · updatedAt · status

// Feature — business activity, feature sở hữu schema riêng
export type FeatureActivityRecord = {
  id: string
  transactionHash: Hash
  feature: string // "staking" | "membership" | "lending"
  action: string // nghiệp vụ, feature tự định nghĩa
  createdAt: number
}
```

**Giữ nguyên `status: "pending" | "success" | "reverted" | "unknown"`.** Không đổi `pending` → `confirming`: tên hiện tại đúng, đổi chỉ tạo churn khắp codebase và test.

**Transfer detail ở lại mechanical record, không đẩy sang feature.** `assetSymbol`, `amount`, `recipient`/`spender`, `tokenAddress` đọc được thẳng từ transaction — đó là dữ liệu cơ học, không phải nghiệp vụ. Đẩy chúng sang tầng feature thì một `token-transfer` thuần không thuộc feature nào sẽ không hiển thị nổi. Ranh giới đúng là: **transaction làm gì** thuộc foundation; **vì sao user làm** thuộc feature (pool, tier, position, rank).

Đổi `action` → `kind` ở tầng mechanical là có chủ ý: tránh nhầm với `action` nghiệp vụ của feature. `contract-write` là kind mới cho write không thuộc 3 loại kia — chính là chỗ `staking` cũ đi vào.

#### Invariant bắt buộc

```text
· feature activity ghi idempotent theo hash hoặc operation ID
· feature activity ghi lỗi KHÔNG đổi transaction outcome
· thiếu feature activity vẫn hiển thị được như generic contract write
· compose hai nguồn không tạo duplicate entry
· cleanup một nguồn không làm hỏng nguồn còn lại
· once-per-hash side effect giữ nguyên (0008)
```

Invariant 2 và 3 là phần an toàn: history là side effect, không được phép làm hỏng hoặc che kết quả transaction thật.

Schema đổi → bump storage key lên `v3` (`0012` dòng 68), history `v2` bị bỏ lại. Phải ghi vào `0012` như quyết định có ý thức — đây là **foundation decision change thật**, sửa `0012` trong cùng commit.

#### Đây là mất tính năng đang chạy, không phải hệ quả phụ (R3)

Đo được: `use-staking-write.ts:291` ghi `action: "staking"`, `RecentTransactionsCard` hiển thị nó. Sau khi tách, card **không còn tự thấy staking entry**, và bump `v3` bỏ lại history cũ trong `localStorage` của người dùng.

Phải làm, không được để trôi:

| Việc                                                                                  | Ai                 |
| ------------------------------------------------------------------------------------- | ------------------ |
| Xây tầng feature activity cho staking + chỗ compose hai nguồn khi hiển thị            | cùng người làm 4.4 |
| Cập nhật `use-staking-write.test.tsx:442` và `:476` (đang assert `action: "staking"`) | cùng commit        |
| Ghi vào `0012`: mất history `v2` là chấp nhận có ý thức                               | cùng commit        |

Hai test trên thuộc luồng transaction, không phải test vặt — sửa chúng phải giữ nguyên ý nghĩa assert, không phải xóa cho xanh.

Chấp nhận được vì chưa app nào production. Điều kiện này hết hiệu lực ngay khi app đầu tiên lên production — sau đó đổi schema cần migration, không phải bump key.

### 4.5. ESLint boundary → error

Thêm `@/components`, `@/i18n`, `@/config` vào `no-restricted-imports` cho foundation. `warn` ở commit đầu để lập inventory, `error` sau khi 4.1–4.4 xong.

**Rule đổi path sau Track 1 (R6).** Rule ở đây viết cho `src/web3/**`; path đó biến mất khi migration đổi thành `packages/web3-evm/**`. Ngoài ra 3 rule ở §2.3 chưa tồn tại:

| Rule                                            | Viết ở track | Ghi chú                                                         |
| ----------------------------------------------- | ------------ | --------------------------------------------------------------- |
| foundation ↛ `@/components`/`@/i18n`/`@/config` | Track 0      | Đổi path trong Track 1                                          |
| `app A ↛ app B`                                 | Track 1      | Chỉ enforce được khi `apps/` tồn tại                            |
| `product app ↛ admin app`                       | Track 1      | Rule dễ bị phá nhất (§2.3)                                      |
| `feature A ↛ feature B`                         | Track 0      | Hiện đã đúng sẵn — chốt lại bằng máy trước khi có người mới vào |

Không để rule nào ở trạng thái "quy ước" khi 2 thành viên mới bắt đầu.

#### `no-restricted-imports` theo alias là KHÔNG đủ

Rule chặn `@/...` không bắt được:

```ts
import { x } from "../../../n-plus-admin/src/features/x" // lọt
```

Enforcement phải phủ **cả bốn đường**: alias import · workspace package import · relative traversal · deep import qua symlink/path mapping. Dùng restricted zones / path boundaries thay vì chỉ `no-restricted-imports`.

**Phải có fixture cố tình vi phạm.** Lint xanh trên code hiện tại không chứng minh rule hoạt động — nó chỉ chứng minh chưa ai vi phạm. Test fixture:

```text
PHẢI PASS    apps/n-plus → @nln/web3-evm
PHẢI FAIL    apps/n-plus → apps/n-plus-admin
PHẢI FAIL    apps/n-plus → ../neura-link/src/*
PHẢI FAIL    feature membership → feature lending
```

Rule không có fixture chứng minh là rule chưa tồn tại.

### 4.6. Documentation authority

`docs/product/nln-feature-source-map.md` §4: hạ ba "Decision" xuống "Candidate" kèm trigger; xóa "automated allowance bypass", "universal execution graph", "nonce management". Hai thành viên mới đọc file này trước khi code — để nguyên là mời họ implement thứ vi phạm `0008`/`0015`.

### 4.7. Decision phải sửa — tổng hợp

Track 0 đụng authority ở 5 chỗ. Sửa **trong cùng commit** với thay đổi code tương ứng, không gom vào một commit "update docs" cuối:

| Decision | Bước    | Mức độ                                                                       |
| -------- | ------- | ---------------------------------------------------------------------------- |
| `0001`   | 4.1     | Sửa nhỏ — chỉ path `evm-tokens.json`. Decision đã hậu thuẫn config injection |
| `0014`   | 4.3     | **Đổi ranh giới thật** — BLOCKER, quyết trước khi code                       |
| `0011`   | 4.3     | Sửa chủ ngữ. Flow `Prepare → Review → Confirm` **không đổi**                 |
| `0012`   | 4.4     | **Đổi schema thật** — union đóng → hai tầng, bump `v3`                       |
| `0016`   | Track 1 | Schema/validator vào package, data ở app (§8.1)                              |

Hai cái in đậm là decision change thật. Foundation decision change phải được cập nhật cùng implementation và chỉ có hiệu lực sau khi PR được merge vào main. Decision file mô tả current truth và phải được cập nhật trong cùng change set khi invariant hoặc ownership thay đổi.

**Nghiệm thu Track 0:** Implementation complete → review diff → merge PR → Track 0 accepted. Điều kiện: 6 command PASS + `git grep -l "@/components\|@/i18n\|@/config" packages/web3-evm/` rỗng + 4 decision Track 0 đã cập nhật trong PR.

---

## 5. Track 1 — Workspace migration (sau Track 0)

> **Trạng thái: HOÀN THÀNH (trừ spike deploy isolation §5.5).**
> Workspace monorepo `nln-platform` đã được thành lập với `packages/web3-evm` và `apps/n-plus`. Root project chỉ giữ lại tooling (`prettier`, `eslint`, `husky`, `lint-staged`, `typescript`, `tsx`).
> `pnpm --filter n-plus build` và `pnpm --filter @nln/web3-evm test:run` chạy độc lập.

### 5.1. Chi phí đo được

```text
108 file chạm @/web3
├── 80 nằm trong foundation  → intra-package, phần lớn không đổi
└── 28 nằm ngoài             → đổi sang @nln/web3-evm
    auth 12 · staking 7 · components/web3 4 · app/contracts/lib/mocks 5
```

Một commit cơ học, zero behavior change. Không trộn với thay đổi hành vi.

### 5.2. Merge repo

Không bảo toàn history riêng của template `shadcn-admin` → copy file UI template cần thiết vào `apps/*-admin`, một commit import cơ học. Không cần `subtree`/`filter-repo`. Từ sau migration, history của monorepo giữ bình thường.

`nln-frontend` → `apps/n-plus` **giữ nguyên nội dung**, gồm `web3-lab` và staking demo. `ARCHITECTURE.md` §5 đã xếp `web3-lab` là reference/dev-only nên nó ở lại được; gate khỏi production build sau.

`shadcn-admin` (template UI admin) → `apps/n-plus-admin`: đây là nguồn copy UI template để xây dựng các admin app. Chỉ mang sang `components/`, `features/`, `styles/`, `lib/`, `hooks/`. Routing layer (`src/routes/`, `routeTree.gen.ts`, `main.tsx`) viết lại theo App Router (§2.2) — không copy.

**Đây là migration thật, không phải đổi thư mục route.** Phải audit thêm, mỗi thứ đều có thể nằm rải trong `components/`/`features/` chứ không chỉ trong `routes/`:

```text
import.meta.env          route guard              CSS entrypoint
TanStack Router loader   Vite-only alias          icon/font asset path
search-param schema      generated route tree     browser-only module init
test environment         data fetching assumption
```

Acceptance criteria cho `n-plus-admin`:

```text
· build Next độc lập
· routing tương đương các screen cần thiết
· không còn import runtime của Vite / TanStack Router
· env theo contract của Next
· direct navigation và refresh hoạt động (không chỉ client-side nav)
· auth guard hoạt động
· production asset path hoạt động
```

### 5.3. Không cần build pipeline

Next `transpilePackages` ăn thẳng TS/TSX nguồn. Không cần tsup/rollup, và `"use client"` được Next giữ qua compile.

Quyết định Next-cho-cả-6 (§2.2) loại luôn vấn đề Rollup `"use client"`. Nếu về sau có consumer non-Next thật: chạy spike trước, xử lý đúng warning đã reproduce được, **không** thêm `onwarn` suppression toàn cục — suppress theo pattern sẽ nuốt luôn warning thật sau này.

### 5.4. Acceptance criteria

- `import từ @nln/web3-evm/address` → **không** kéo React, Wagmi, TanStack Query; không khởi tạo provider; không chạy application config. **Viem được phép**: `address.utils.ts:1` import `getAddress`/`isAddress`/`zeroAddress` — đó là pure tree-shakeable primitive, và authority chỉ yêu cầu leaf này React-free + Wagmi-free;
- `@nln/web3-evm/errors` tách hai tầng: pure error taxonomy (`evm-errors.ts`) không kéo adapter runtime; adapter Viem/Wagmi (`evm-error.adapter.ts`, `evm-wallet-rejection.ts`) là entry riêng cho ai cần;
- import một hook từ barrel → không kéo 9 component;
- import pure leaf không khởi tạo provider;
- mỗi app đang tồn tại mount `WagmiProvider` và hooks nhận đúng context (một instance react/wagmi/query);
- `pnpm --filter <app> build` chạy độc lập;
- **deploy isolation spike**: kiểm chứng root directory + install scope trên platform thật, không giả định (§5.5).

### 5.5. Deployment isolation — 6 unit

Target: 6 deployment unit riêng biệt.

```text
n-plus     · n-plus-admin
neura      · neura-admin
neura-link · neura-link-admin
```

Mỗi unit có environment, build, domain, deployment project, secret/RPC config và rollback riêng. **Sửa một admin không được kéo theo deploy 5 app còn lại** — đây là tiêu chí của spike, không phải kỳ vọng.

Spike chạy trên cặp đầu tiên (`n-plus` + `n-plus-admin`) vì đó là lúc rẻ nhất để phát hiện platform không hỗ trợ; phát hiện ở app cuối thì đã có 3 pipeline sai phải sửa.

#### Phần repo-side — ĐÃ ĐO, PASS

Không cần chờ platform và không cần chờ admin app: đo được bằng `pnpm --filter "...[<git-ref>]"`,
thứ pnpm tính từ đồ thị workspace (package đã đổi **cộng** package phụ thuộc vào chúng).
Chạy với một `apps/probe-app` tạm rồi xoá:

| Thay đổi ở                          | Kỳ vọng                     | Đo được                     |
| ----------------------------------- | --------------------------- | --------------------------- |
| file trong app A                    | chỉ app A                   | chỉ `apps/n-plus` ✅        |
| file trong app A (có app B tồn tại) | **không** kéo app B         | app B không được chọn ✅    |
| file trong package                  | package + mọi app phụ thuộc | package + **cả hai** app ✅ |
| chỉ docs ở root                     | không app nào               | chỉ root ✅                 |

Kèm `pnpm --filter n-plus build` và `pnpm --filter @nln/web3-evm test:run` chạy độc lập.

Kết luận: **workspace không phải chỗ mất isolation.** Tiêu chí 1 và 3 đạt; tiêu chí 2 chỉ còn
vế platform.

##### Cảnh báo trước khi ai đó nối filter này vào CI

Đo được, không phải suy đoán: khi thay đổi chạm **file ở root** (docs, `eslint.config.mjs`,
lockfile, chính `.gitlab-ci.yml`), filter chọn `<ROOT>` — và `pnpm --filter "...[ref]" -r`
lúc đó chạy **toàn bộ** package, không phải không chạy gì.

```text
sửa app A            → chọn app A            → chỉ app A chạy
sửa package          → chọn package + app    → cả hai chạy
sửa docs ở root      → chọn <ROOT>           → TẤT CẢ package chạy
```

Đây là lệch về phía **an toàn** (thừa, không bao giờ thiếu), nhưng nghĩa là filter thường
xuyên thoái hoá thành "chạy hết" vì phần lớn MR có đụng một file root. Hệ quả thực tế:

- **chưa nên nối vào CI khi mới có một app** — nó thêm một cơ chế có thể bỏ qua verification
  trong khi gần như không tiết kiệm được gì, đúng loại rủi ro "xanh giả" đã cắn repo này hai
  lần (§10.1, R5);
- khi có app thứ hai thì mới đáng, và lúc đó **đừng dùng `rules:changes` với danh sách path
  tự bảo trì** — nó sẽ lệch khỏi đồ thị phụ thuộc thật. Dùng chính filter của pnpm, cộng
  `GIT_DEPTH: 0` để diff resolve được base sha, và **không filter trên branch được deploy**.

#### Phần còn lại — vế platform

Câu hỏi chưa trả lời được không phải "có tính được app nào cần deploy không" (tính được rồi)
mà là **"nơi deploy có chịu dùng phép tính đó không"**. Nhiều host mặc định build lại toàn repo
mỗi lần push. Cụ thể cần kiểm trên platform thật:

```text
· đặt được root directory riêng cho từng app?
· bỏ qua được build khi path của app đó không đổi?
· secret scope theo từng deployment project?
```

Hiện repo **chưa có deployment nào**: `.gitlab-ci.yml` chỉ có `format → typecheck → lint →
test → build`, không job `deploy`, không `environment:`, và không có `vercel.json`/`Dockerfile`.
Nên vế này chưa chạy được vì chưa có pipeline để đo, không phải vì thiếu credential.

---

## 6. Track 2 — Feature Module Contract (song song Track 0)

### 6.1. Vấn đề đo được

`features/staking` phụ thuộc 6 thứ ngoài chính nó:

| Dependency                                      | Số chỗ | Loại            |
| ----------------------------------------------- | ------ | --------------- |
| `@/web3/evm`                                    | 7      | Foundation      |
| `@/contracts/registry/contract-registry`        | 1      | Host            |
| `@/components/web3/common/transaction-feedback` | 4      | Host            |
| `@/components/ui/{button,input}`                | 4      | Host            |
| `@/i18n/i18n-provider`                          | 2      | Host (chỉ test) |

Copy sang app khác hôm nay = compile lỗi, người copy phải tự đoán 5 thứ trên.

**i18n — một public path duy nhất.** Đo được: toàn repo có 16 chỗ dùng `@/i18n/use-translation` và 6 chỗ dùng `@/i18n/i18n-provider`; riêng `features/staking` thì cả 2 chỗ `i18n-provider` đều nằm trong file `.test.tsx` làm wrapper, production code của staking không dùng i18n. Host capability công bố là:

```text
@/i18n/use-translation     ← feature dùng cái này
@/i18n/i18n-provider       ← app mount, test wrap. Feature KHÔNG import
```

Feature không import provider implementation khi nó chỉ cần hàm dịch.

Đã đúng sẵn, cần giữ: **zero cross-feature import**, và `features/staking/index.ts` đã là public barrel.

### 6.2. Deliverable — `docs/foundation/FEATURE_MODULE_CONTRACT.md`

Host capability contract (5 path trên, ghi rõ là _bắt buộc_ chứ không phải internals tùy ý phụ thuộc) · feature structure chuẩn · luật · checklist copy.

**Chưa thêm `@/host/*`.** Cả 6 app dùng Next và cùng design system nên vấn đề `@/host/ui` giải quyết chưa tồn tại. Nếu chỉ re-export thì là indirection không đổi lấy gì; muốn thật sự chống vỡ khi design system lệch nhau thì `@/host/ui` phải là anti-corruption layer, một dự án riêng. Xét lại khi có app thật sự chọn UI khác.

### 6.3. Hai nhóm feature module — product và admin

Contract phải phân biệt rõ:

```text
apps/neura-link/src/features/membership/                  ← product
apps/neura-link-admin/src/features/membership-management/ ← admin
```

| Product feature                                                   | Admin feature                                                                                                    |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| purchase / upgrade membership · staking · lending · MLM user view | membership config · staking pool mgmt · lending mgmt · reward config · user/rank mgmt · treasury/operator action |

Cùng domain nhưng **không import nhau** — hai app khác deployment và khác permission model.

**Không tạo package `membership` dùng chung** chỉ vì hai phía cùng nói về "membership". Thứ thật sự chung là ABI và deployment address, đã có đường đi riêng (§8). Phần còn lại — read model, quyền, UI, validation — khác nhau về bản chất.

### 6.4. Auth và RBAC — hai candidate khác nhau, không phải một

"Copy per app" nói gọn quá và tự mâu thuẫn: không thể copy `features/auth` hiện tại vào cả 6 app khi hai admin dùng login khác hẳn. Tách rõ:

```text
PRODUCT AUTH (SIWE)
  · features/auth hiện tại là reference, copy sang product app
  · trigger promote: ≥3 product app dùng cùng login/session contract thật

ADMIN AUTH
  · KHÔNG copy SIWE auth sang admin
  · mỗi admin tự implement login/session/RBAC (spec A030100_Admin-Login)
  · trigger promote: nhiều admin chứng minh cùng contract thật — riêng biệt
    với trigger của product auth
```

Đây là **hai candidate abstraction độc lập**, promote độc lập. Không mặc định hai admin cùng permission model, và product A ↛ admin A: khác đối tượng, khác session, khác quyền.

Trigger đếm theo **số app**, không theo "số lần port thủ công" (R4). Đo được: 7 file production của `features/auth` import `@/web3`; copy sang các product app là 21 điểm coupling với foundation. Đếm theo số lần đau thì tới lúc chạm trigger đã trả giá quá nhiều lần; đếm theo số app thì quyết định đến trước chi phí.

Đây là nợ có chủ ý, ghi ở đây để không quên.

### 6.5. Phạm vi copy feature

```text
Foundation @nln/web3-evm  → dùng chung cho các EVM app (N+, Neura Link) ✅
Feature copy product → product                          ✅
Feature copy admin → admin                              ✅
Feature copy product ↔ admin                            ❌  Không dùng / Không cần thiết (khác session, RBAC & logic)
```

Next cho cả 6 (§2.2) gỡ được rào framework. Rào còn lại là ngữ nghĩa: feature admin và feature product cùng domain vẫn là hai thứ khác nhau (§6.3).

### 6.6. `features/staking` thành reference module

**Reference implementation**, không phải shared staking SDK.

---

## 7. Track 3 — Membership và Lending

Transaction-plan verdict **DEFER** giữ nguyên.

### 7.1. Copy gì, không copy gì

Copy nguyên `use-staking-write.ts` (~300 dòng) sẽ mang theo assumption riêng của staking. Bắt buộc copy: **structure · lifecycle pattern · test contract · safety checklist**. Không copy business implementation — mỗi feature tự sở hữu builders, ABI, prepared data, domain errors.

### 7.2. Cùng test contract, bắt buộc cả hai

```text
preflight · simulation · review trước confirm · duplicate-submit guard
stale-operation isolation · receipt terminal evidence
once-per-hash side effects · account/chain/config invalidation
```

Nếu mỗi bên tự nghĩ cách riêng, kết quả không phải duplication để so sánh mà là ba cách hiểu khác nhau về transaction safety.

### 7.3. Sau khi cả hai land

So sánh approval sequencing · prepared state · receipt gating → xác định phần thật sự chung → khi đó mới cân nhắc coordinator.

### 7.4. Vẫn cấm

`useTransaction` nhận arbitrary ABI; execution graph tổng quát; auto approve → auto submit; nonce management. Approval receipt success vẫn là điều kiện bắt buộc trước primary transaction.

---

## 8. Việc nhỏ đã chốt

### 8.1. Contract registry — schema chung, data riêng từng app

Schema + validator vào `@nln/web3-evm`; **address data thuộc từng app**, cả 6:

```text
apps/<app>/src/contracts/registry/     ← mỗi app một bản, gồm cả admin
```

Cập nhật `0016` (hiện quy định toàn bộ là application-owned).

Product và admin cùng dự án dùng cùng deployment manifest về mặt nội dung, nhưng **app này không import source app kia** (§2.3). Nếu duplication thành đau thật: tạo package riêng cho từng product, hoặc generate manifest vào cả hai app từ một nguồn. Không phá boundary để tiện.

### 8.2. Foundation adoption — mỗi app một tài liệu

Không dùng chung một file. `docs/foundation/` là authority chung; mỗi app có bản adoption riêng:

```text
apps/<app>/docs/product/foundation-adoption.md   ← 6 bản
```

Mỗi bản ghi: foundation version / workspace dependency · network config · module đang bật · optional module đã gỡ · ràng buộc riêng của product · ai sở hữu deployment.

Lưu ý: `docs/product/foundation-adoption.md` hiện có câu "application và foundation share cùng Git commit" — đúng trong monorepo, nhưng phải viết lại nếu về sau tách repo (§1.2).

### 8.3. `contracts/` và `scripts/` — giao chủ trước Track 1 (R2)

Root hiện có hai thứ **plan chưa gán cho ai**:

```text
contracts/  src · tooling · artifacts · tests · README   ← Solidity
apps/<app>/scripts/  web3-smoke.ts (entry)
package.json: staking:compile · staking:deploy-sepolia · web3:smoke
```

Đây không phải chi tiết vặt: cả 6 app đều cần contract, nên để trong một app là sai; để nguyên ở root thì vi phạm luật 5 (§3.2 — root chỉ tooling).

**Chốt luôn, không để mở tới lúc migration** — không bắt đầu di chuyển file được khi path đích chưa có chủ:

| Hạng mục                    | Thuộc về                 | Lý do                                                                 |
| --------------------------- | ------------------------ | --------------------------------------------------------------------- |
| `EvmProvider`               | `packages/web3-evm`      | Adapter chính thức của runtime — package sở hữu cách mount chính nó   |
| `createWagmiConfig`, schema | `packages/web3-evm`      | Cùng lý do                                                            |
| Smoke logic/helper          | `packages/web3-evm`      | Nó test chính foundation — `@nln/web3-evm/testing`, đã tách           |
| `Web3Providers` composition | `apps/<app>`             | App quyết định mount runtime nào, theo thứ tự nào                     |
| Env parsing                 | `apps/<app>`             | Env name là application concern (§4.1)                                |
| `EvmRuntimeConfig` instance | `apps/<app>`             | Consumer cung cấp config                                              |
| Smoke entry script          | `apps/<app>`             | Nó cần env và network list của app; root chỉ delegate bằng `--filter` |
| Solidity source + tooling   | `apps/n-plus/contracts/` | Là **test fixture**, không phải production contract — xem dưới        |

**Không tạo `packages/contracts`.** Deployment duy nhất đang tồn tại là `TestStakingVault` `test-v1` trên Sepolia, kèm `contracts/tests/test-staking-vault.test.ts`. Đó là fixture của staking demo, không phải contract dùng chung của cả 6 app. Tạo package cho thứ "app nào đó có thể cần" là đúng anti-pattern mà cả plan này chống.

Xét lại khi có product contract thật với ABI và địa chỉ. Nếu về sau fixture dùng để test transaction mechanics của foundation chứ không phải nghiệp vụ staking, chỗ đúng là `packages/web3-evm/testing/contracts/`.

`contracts/artifacts` đi theo Solidity source; app tiêu thụ ABI qua registry (§8.1), không import thẳng artifacts.

---

## 9. Phân công

| Track                        | Ai                | Chặn ai                                            |
| ---------------------------- | ----------------- | -------------------------------------------------- |
| Track 0 — readiness          | Foundation        | Chặn 4 việc ở §9.1, **không phải tất cả**          |
| Track 1 — workspace          | Foundation        | Chặn admin Web3 integration                        |
| Track 2 — module contract    | Song song Track 0 | **Chặn 2 thành viên mới**                          |
| Track 3 — membership/lending | 2 thành viên      | Chờ Track 2                                        |
| `n-plus-admin`               | Thành viên admin  | Port routing + non-Web3 làm ngay; Web3 chờ Track 1 |
| MLM                          | sau               | Chờ **API contract backend**, không phải web3      |

MLM chủ yếu là read + backend/indexer. Xác định API contract sớm để track này không đứng chờ nhầm thứ.

### 9.0. Capacity thật — 3 người, không phải 4 vai

Bảng trên liệt kê 6 dòng nhưng chỉ có 3 người. Không cam kết membership, lending và admin migration cùng chạy full speed.

```text
Người 1   Track 0 → Track 1 → review Track 2
Người 2   draft Track 2 → Membership
Người 3   Admin Next migration → Lending sau khi admin shell ổn
```

Hệ quả phải chấp nhận: **lending bắt đầu sau membership**, không song song. Nếu muốn membership và lending thật sự song song thì admin migration phải giới hạn ở routing/shell tối thiểu trong lúc chờ — chọn một, không chọn cả hai.

Đây là ràng buộc capacity, không phải ràng buộc kỹ thuật.

### 9.1. Track 0 chặn gì, không chặn gì

Bảng trên từng ghi "chặn tất cả" trong khi chính §6 và §9 lại cho ba việc chạy song song. Nói rõ để không ai đứng chờ nhầm:

```text
Track 0 CHẶN
  · workspace extraction của web3 package
  · admin Web3 integration
  · membership/lending write flow dùng foundation
  · nhân bản foundation sang consumer mới

Track 0 KHÔNG CHẶN
  · FEATURE_MODULE_CONTRACT.md
  · product spec
  · admin non-Web3 screens
  · backend/API contract
  · pure domain work không phụ thuộc Web3
```

```text
Bước 1 : 4.6 docs authority (song song) · 4.1 config injection · 4.2 wagmi init · 4.5 ESLint warn
Bước 2 : 4.3 component ownership · 4.4 history hai tầng · 4.5 ESLint error
Bước 3 : Track 1 workspace migration + deploy spike
Song song: Track 2 module contract + staking thành reference
Sau đó : Track 3 membership + lending
Chưa làm: RPC fallback · observability package · UI/staking/MLM package · transaction-plan coordinator
```

### 9.2. Solana Runtime — Package song song `@nln/web3-solana`

Neura System (`apps/neura` & `apps/neura-admin`) sử dụng Solana runtime. Tuân thủ ranh giới độc lập theo `CHAIN_FAMILY_TEMPLATE.md`:

```text
· Tạo packages/web3-solana dưới dạng sibling package song song với packages/web3-evm
· KHÔNG gộp Solana code vào packages/web3-evm
· KHÔNG ép Solana vào EVM Address/Wagmi abstractions; sở hữu riêng account, program ABI, wallet-adapter, connection client và error taxonomy
```

`CAPABILITIES.md` đã liệt non-goal: "tự failover giữa các chain family", "ép các chain family vào một transaction model giả". `docs/foundation/CHAIN_FAMILY_TEMPLATE.md` là tài liệu, không phải implementation đang dở.

---

### 10. Validation baseline

Danh sách kiểm tra tự động trước khi release:

| Command             | Kết quả  | Chi tiết                                        |
| ------------------- | -------- | ----------------------------------------------- |
| `pnpm typecheck`    | **PASS** | exit 0                                          |
| `pnpm lint`         | **PASS** | exit 0                                          |
| `pnpm format:check` | **PASS** | exit 0                                          |
| `pnpm test:run`     | **PASS** | 55 file, 527 test                               |
| `pnpm build`        | **PASS** | Next 16.2.12 Turbopack, 4 route                 |
| `pnpm web3:smoke`   | **PASS** | 2/2 network · 3 token · 3 balance · 3 allowance |

Live read baseline này quan trọng vì Track 0 sẽ đổi registry và RPC handling — có before/after để đối chiếu.

### 10.0. `web3:smoke` là release evidence, không phải per-commit gate

Smoke gọi RPC công cộng thật. Để nó chạy mỗi commit thì một lần outage của thirdweb/reth làm đỏ toàn bộ CI mà không có regression nào.

```text
MỖI COMMIT      typecheck · lint · format:check · test:run · build
SIGN-OFF        web3:smoke — bắt buộc ở cuối Track 0 và cuối Track 1
```

**Khi smoke fail, phân biệt trước khi kết luận:** code regression hay external RPC outage. Ghi nguyên nhân vào PR. Không tự động claim pass, và cũng không tự động đổ cho outage — kiểm bằng cách chạy lại với `--chainId` khác hoặc RPC khác.

Mỗi track chạy lại 5 command trước khi merge; smoke ở mốc sign-off. Track 0 thêm điều kiện grep rỗng + 5 decision đã cập nhật (§4.7); Track 1 thêm acceptance criteria ở §5.4.

**`pnpm check` hiện chỉ chạy 4 lệnh (R7)** — `package.json:19` thiếu `format:check`, và `web3:smoke` không nằm trong đó (đúng, vì nó gọi mạng thật). Đừng nhầm "chạy `check`" là đã đủ 6. Thêm `format:check` vào `check`; `web3:smoke` giữ riêng và chạy có chủ ý.

### 10.1. Sau workspace migration — script phải chạy toàn workspace

Nguy cơ thật: 6 command trên vẫn xanh vì chúng chỉ chạy app cũ, trong khi package hoặc admin đã hỏng. Root script phải đổi sang recursive:

```json
{
  "typecheck": "pnpm -r typecheck",
  "lint": "pnpm -r lint",
  "format:check": "prettier . --check",
  "test:run": "pnpm -r test:run",
  "build": "pnpm -r --if-present build",
  "check": "pnpm typecheck && pnpm lint && pnpm format:check && pnpm test:run && pnpm build"
}
```

Điều kiện: mỗi package/app phải tự có `typecheck`, `lint`, `test:run` — nếu thiếu thì `pnpm -r` bỏ qua im lặng và ta lại tự lừa mình. Track 1 kiểm tra từng app xuất hiện trong output.

### 10.2. Tách test infrastructure — việc thật, chưa ước lượng (R5)

Hôm nay **một** `vitest.config.mts` ở root chạy toàn bộ 55 file / 527 test. §10.1 yêu cầu `pnpm --filter @nln/web3-evm test:run`, nghĩa là:

```text
packages/web3-evm/vitest.config.mts   ← test của foundation
apps/<app>/vitest.config.mts          ← test của từng app
```

Phải chia 527 test về đúng chỗ (foundation ~80 file `src/web3`, phần còn lại về app), và mỗi nơi cần setup riêng — `msw` handler, `playwright` config hiện cũng ở root. Đây là công việc của Track 1, không phải thao tác đổi path.

Rủi ro cụ thể: nếu package không có `test:run`, `pnpm -r` bỏ qua và validation vẫn xanh trong khi foundation không được test lần nào. Kiểm bằng cách đếm số test trong output tổng so với 527, không chỉ nhìn exit code.

Track 1 chạy thêm, tên filter khớp chính xác `name` trong từng `package.json`:

```bash
pnpm --filter @nln/web3-evm test:run
pnpm --filter n-plus build
pnpm --filter n-plus-admin build
pnpm web3:smoke
```

Target khi đủ 6 app — mỗi app build được độc lập, không app nào kéo theo app khác:

```bash
pnpm --filter n-plus     build      pnpm --filter n-plus-admin     build
pnpm --filter neura      build      pnpm --filter neura-admin      build
pnpm --filter neura-link build      pnpm --filter neura-link-admin build
```

Phase đầu chỉ 2 app tồn tại; `--if-present` ở root script (§10.1) làm việc này tự đúng khi thêm app, không phải sửa lại script mỗi lần.

---

## 11. Sổ rủi ro

Review plan ngày 2026-08-06. Mỗi mục verify được từ source, không phải suy đoán.

| #   | Rủi ro                                                        | Mức     | Xử lý ở    | Trạng thái                                        |
| --- | ------------------------------------------------------------- | ------- | ---------- | ------------------------------------------------- |
| R1  | §4.1 làm vỡ `web3:smoke` — mất công cụ đối chiếu before/after | Cao     | §4.1       | Đóng — smoke sửa cùng commit, PASS mọi mốc        |
| R2  | `contracts/` và `scripts/` chưa có chủ sau migration          | Cao     | §8.3       | Đóng — contracts về app, smoke entry ở root       |
| R3  | §4.4 là mất tính năng đang chạy + 2 test sẽ đỏ                | Cao     | §4.4       | Đóng — ghi vào `0012`, 2 test giữ nguyên ý nghĩa  |
| R4  | Trigger promote auth đo sai đơn vị (42 điểm coupling)         | Trung   | §6.4       | **Mở** — chờ product app thứ hai                  |
| R5  | Test infrastructure một bản ở root, chưa tách                 | Trung   | §10.2      | Đóng — 2 vitest config, 25/283 + 31/259           |
| R6  | ESLint rule đổi path sau Track 1; 3 rule §2.3 chưa tồn tại    | Trung   | §4.5       | Đóng — rule + fixture trỏ path package và app     |
| R7  | `pnpm check` chỉ chạy 4 lệnh, không phải 6                    | Thấp    | §10        | Đóng — `format:check` đã thêm                     |
| R9  | Không có abort criteria cho deploy isolation spike            | Trung   | §11.1      | **Mở một phần** — repo-side PASS, còn vế platform |
| R10 | §4.3 di chuyển component hai lần                              | Thấp    | §4.3       | Đóng — đã ở `apps/n-plus/src/components/`         |
| R11 | §4.3 vi phạm `0014` nếu không sửa decision trước — BLOCKER    | **Cao** | §4.3, §4.7 | Đóng — `0014` sửa trước code, cùng commit         |

Còn mở đúng hai: **R4** chờ consumer thật, **R9** chờ platform. Phần repo-side của R9
đã đo và PASS (§5.5), nên thứ còn có thể sai đắt tiền đã thu hẹp lại còn hành vi của host.

### 11.1. Abort criteria — deploy isolation spike (R9)

Spike ở §5.5 là chỗ duy nhất kiến trúc có thể sai theo cách đắt tiền. Plan có spike nhưng không có nhánh "nếu không đạt thì sao".

```text
Điều kiện PASS
  · mỗi app build từ root directory riêng, không kéo app khác
  · deploy một app không trigger deploy app còn lại
  · secret/env tách được theo từng app

Nếu FAIL
  · KHÔNG tiếp tục thêm app thứ ba trở đi
  · đánh giá lại: đổi platform, hay tách repo sớm hơn dự định (§1.2)
  · Track 0 và packages/web3-evm giữ nguyên giá trị trong cả hai nhánh
```

Điểm cuối là lý do spike không phải rủi ro sống còn: công sức Track 0 không mất đi kể cả khi mô hình monorepo phải đổi.

### 11.2. Điều kiện đang đúng, sẽ hết hiệu lực

Ghi lại để không ai dựa vào chúng sau khi chúng hết đúng:

| Giả định hiện tại                                    | Hết hiệu lực khi                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| Chưa app nào production → bump storage key thoải mái | App đầu tiên lên production (§4.4)                                              |
| Không có yêu cầu source isolation                    | Hợp đồng khách hàng yêu cầu (§1.2)                                              |
| Cả 6 app dùng Next → `ssr: true` luôn đúng           | Có consumer non-Next thật (§4.1)                                                |
| Public RPC default dùng được                         | App đầu tiên lên staging/production — `0001` cấm coi đây là production strategy |
