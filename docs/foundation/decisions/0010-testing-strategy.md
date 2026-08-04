# 0010 Testing strategy

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

- mock Wagmi;
- dùng `QueryClient` thật;
- không chạm blockchain.

Kiểm tra:

- selection reset;
- simulation account binding;
- write lifecycle;
- duplicate submissions;
- stale operation ownership;
- receipt callbacks once-per-hash;
- cache invalidation;
- history persistence isolation;
- recovery sau simulation/submission failure.

### 3. Live read smoke tests

```bash
pnpm web3:smoke
pnpm web3:smoke -- --chainId <chainId>
```

Kiểm tra:

- RPC reachability;
- supported chain registry;
- live token `symbol`;
- live token `decimals`;
- registry/on-chain metadata agreement.

Smoke tests chỉ đọc và cleanup timers qua `try...finally`.

### 4. Local testnet writes

Current reference script:

```text
scripts/web3-sepolia-send.local.ts
```

Sepolia là reference test network hiện tại, không phải foundation requirement.

Application có thể thay hoặc bổ sung local write script cho test network được adopt, nhưng phải giữ:

- test-only wallet;
- private key chỉ trong local environment;
- non-production funds;
- explicit receipt verification;
- không chạy mặc định trong CI.

## Boundaries

- Mock tests không chứng minh RPC endpoint hoặc registry metadata khớp on-chain.
- `QueryClient` không được mock trong hook tests; mock che mất invalidation, dedupe và refetch thật.
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

Implementation:

- `scripts/web3-smoke.ts`
- `scripts/web3-sepolia-send.local.ts`
- `scripts/load-env.ts`

Tests:

- `src/web3/evm/adapters/*.test.ts`
- `src/web3/evm/hooks/*.test.tsx`
- `src/web3/evm/storage/evm-transaction-history.storage.test.ts`
- `src/components/web3/web3-lab.test.tsx`
