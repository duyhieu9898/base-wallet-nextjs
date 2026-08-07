# 0010 Testing strategy

Scope: **family-neutral.** Bốn tầng proof và trách nhiệm của mỗi tầng đúng với
mọi chain family. Tên script, mock library và test network là instance của từng
runtime; chúng được nêu ở đây làm ví dụ hiện hành (EVM), không phải là rule.

## Purpose

Không một tầng test nào chứng minh được toàn bộ Web3 behavior: mock không chứng minh RPC hoạt động, live read không chứng minh write path, và write thật không chạy deterministic trong CI. Mỗi tầng phải chịu trách nhiệm cho một loại rủi ro.

## Decision

Bốn tầng test, mỗi tầng chỉ chứng minh behavior thuộc boundary của nó:

```text
pure function tests
hook tests
live read smoke
local testnet writes
```

## Required behavior

### 1. Pure function tests

Kiểm tra:

- normalize;
- registry validation;
- builders;
- mappers;
- error mapping;
- write status derivation;
- review model;
- storage schema.

Không cần network.

### 2. Hook tests

- mock lớp chain-access của runtime — EVM: Wagmi;
- dùng query client thật, không mock;
- không chạm blockchain.

Kiểm tra:

- selection reset;
- preflight account binding;
- write lifecycle;
- duplicate submissions;
- stale operation ownership;
- confirmation callbacks once-per-terminal-reference — EVM: once-per-hash receipt callbacks;
- cache invalidation;
- history persistence isolation;
- recovery sau preflight/submission failure.

### 3. Live read smoke tests

Kiểm tra:

- RPC reachability;
- supported network registry;
- live asset metadata đọc từ chain;
- registry/on-chain metadata agreement.

Script là của từng runtime. EVM hiện tại:

```bash
pnpm web3:smoke
pnpm web3:smoke -- --chainId <chainId>
```

Smoke tests chỉ đọc và cleanup timers qua `try...finally`.

### 4. Local testnet writes

Mỗi runtime cung cấp script write của riêng nó cho test network của nó. EVM
reference hiện tại:

```text
scripts/web3-sepolia-send.local.ts
```

Sepolia là reference test network của EVM, không phải foundation requirement.

Application có thể thay hoặc bổ sung local write script cho test network được adopt, nhưng phải giữ:

- test-only wallet;
- private key chỉ trong local environment;
- non-production funds;
- explicit verification bằng terminal evidence của runtime đó;
- không chạy mặc định trong CI.

## Boundaries

- Mock tests không chứng minh RPC endpoint hoặc registry metadata khớp on-chain.
- Query client không được mock trong hook tests; mock che mất invalidation, dedupe và refetch thật. EVM dùng TanStack `QueryClient`.
- Smoke tests không chứng minh write path.
- Local write script không chạy mặc định trong CI: cần funded wallet và private key, tạo rủi ro bảo mật và kết quả không deterministic.
- Không claim một command đã pass nếu chưa thực sự chạy.
- Test mới phải được đặt đúng tầng thay vì mở rộng tầng dễ viết nhất.
- Network-specific scripts là reference artifacts; application adoption chịu trách nhiệm thay chúng theo selected network.

Deferred:

- fork-node deterministic write automation;
- component-level interaction tests đầy đủ cho từng form (`Web3Lab` chỉ có composition smoke coverage, không thay thế full user-flow tests).

## Enforcement

- Cấu trúc thư mục test theo layer.
- Script riêng cho smoke và local write.
- Quality gates: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test:run`, `pnpm build`.

## Code and tests

Instance hiện tại là EVM. Family runtime mới bổ sung mục của riêng nó, không sửa
các đường dẫn dưới đây.

Implementation:

- `scripts/web3-smoke.ts`
- `scripts/web3-sepolia-send.local.ts`
- `apps/<app>/scripts/web3-smoke.ts` — entry; env qua `loadEnvConfig` của `@next/env`

Tests:

Test nằm cạnh capability sở hữu chúng, không gom vào một thư mục chung:

- `packages/web3-evm/src/chain/**/*.test.ts` — registry và selection
- `packages/web3-evm/src/reads/**/*.test.*` — balances và allowances
- `packages/web3-evm/src/errors/*.test.ts` — normalization và wallet rejection
- `packages/web3-evm/src/address/*.test.ts`
- `packages/web3-evm/src/transactions/lifecycle/*.test.ts` — write status derivation
- `packages/web3-evm/src/transactions/{fees,history,invalidation}/*.test.*`
- `packages/web3-evm/src/transactions/{native-transfer,erc20-transfer,erc20-approval}/*.test.*`
  — prepare, review và hook của từng slice
- `src/components/web3/web3-lab.test.tsx`
