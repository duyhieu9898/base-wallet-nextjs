# 0012 Local transaction history

## Purpose

Transaction đã broadcast phải tiếp tục được theo dõi kể cả khi UI rerender, account/chain thay đổi, receipt query tạm lỗi, page reload hoặc nhiều tab cùng mở.

Storage là side effect phụ, không phải source of truth cho transaction success.

## Decision

History tách **hai tầng**:

```text
Foundation  mechanical record — transaction làm gì
Feature     activity record   — vì sao user làm
```

Foundation chỉ ghi thứ đọc được từ chính transaction. `assetSymbol`, `amount`,
`recipient`/`spender`, `tokenAddress`, `contractAddress` **ở lại tầng mechanical**:
đó là dữ liệu cơ học, không phải nghiệp vụ. Đẩy chúng sang feature thì một
`token-transfer` thuần không thuộc feature nào sẽ không hiển thị nổi.

Nghiệp vụ — pool, tier, position, rank, stake/unstake — thuộc feature, trong store
riêng của feature, join theo transaction hash. Không feature registry, không
arbitrary metadata trong mechanical record.

```text
kind: "native-transfer" | "token-transfer" | "token-approval" | "contract-write"
```

Discriminator là `kind`, không phải `action`, để phân biệt rõ với `action` nghiệp vụ
của feature. `contract-write` là kind cho write không thuộc ba loại kia — chỗ
`staking` cũ đi vào.

`FeatureActivityRecord` (`id` · `transactionHash` · `feature` · `action` ·
`createdAt`) là **liên kết** do foundation định nghĩa; mọi field khác do feature tự
sở hữu. Không có shape liên kết cố định thì membership và staking sẽ tự nghĩ ra hai
cách nối business data vào transaction — đúng thứ việc tách này sinh ra để tránh.

Storage key:

```text
base-wallet:evm-transactions:v3
```

`v3` đổi discriminator sang `kind` và bỏ union đóng theo feature. Item ở `v2` bị bỏ
lại, không migrate.

**Đây là mất history đang chạy của người dùng, chấp nhận có ý thức.** Chấp nhận
được vì chưa app nào lên production. Điều kiện này hết hiệu lực ngay khi app đầu
tiên lên production — sau đó đổi schema cần migration, không phải bump key.

Vì sao phải đổi: `v2` để item schema là union đóng theo `action`, nên mỗi feature
mới phải mở rộng union bên trong foundation. Membership, staking và MLM đều cần
variant riêng; ba feature đâm vào một union đóng cùng lúc là va chạm chắc chắn, và
nó buộc foundation phải "biết staking" — điều `EXTENSION_CONTRACT.md` §11 cấm.

Storage adapter:

```text
storage/evm-transaction-history.storage.ts
```

Hook:

```text
hooks/use-evm-transaction-history.ts
```

## Required behavior

Storage adapter:

- runtime validate item schema;
- dedupe theo `chainId + hash`;
- giới hạn tối đa 50 items;
- cô lập local storage exceptions.

Hook:

- expose React state;
- filter theo account/chain;
- đồng bộ cùng tab;
- đồng bộ cross-tab;
- không làm write flow phụ thuộc storage availability.

Write hooks lưu pending item từ immutable submission snapshot ngay khi nhận hash.
Yêu cầu này áp dụng cho cả feature write hook ở tier B (`0015`), không chỉ write
hook của foundation — `useStakingWrite` từng bỏ qua và stake/unstake không bao giờ
xuất hiện trong history.

Mechanical item schema là union đóng theo `kind`; validator từ chối kind lạ **và**
từ chối business field (`action`, `operation`) lọt vào mechanical record. Feature
không mở rộng union này — feature write ghi `contract-write` và đặt nghiệp vụ vào
activity record của mình.

Invariant bắt buộc của tầng feature:

- activity ghi idempotent theo hash hoặc operation ID;
- activity ghi lỗi **không** đổi transaction outcome;
- thiếu activity vẫn hiển thị được như generic contract write;
- compose hai nguồn không tạo duplicate entry;
- cleanup một nguồn không làm hỏng nguồn còn lại;
- once-per-hash side effect giữ nguyên (`0008`).

Hai invariant giữa là phần an toàn: history là side effect, không được phép làm
hỏng hoặc che kết quả transaction thật.

Compose hai nguồn là việc của **application** tại chỗ hiển thị, không phải của
foundation: foundation không biết feature nào tồn tại.

Pending receipt reconciler:

- tiếp tục theo dõi pending history;
- cập nhật success/reverted khi receipt có bằng chứng;
- hoạt động độc lập với local form tracking.

Ngoài ra:

- storage failure không làm submission thất bại, nên có trường hợp transaction gửi thành công nhưng không xuất hiện trong history;
- `stopTrackingReceipt` không xóa pending history;
- thay đổi item schema phải tăng version trong storage key.

## Boundaries

- Local storage không phải chain source of truth: chỉ receipt on-chain chứng minh terminal status.
- History không thay thế receipt; reconciler chạy nền để cập nhật status.
- History không giữ trong React state của form và không phình vô hạn.

## Enforcement

- Runtime validation trong storage adapter.
- `try/catch` cô lập storage exceptions khỏi write path.
- Storage schema tests.
- Hook tests cho persistence isolation và cross-tab sync.

## Code and tests

Implementation:

- `packages/web3-evm/src/transactions/history/evm-transaction-history.storage.ts`
- `packages/web3-evm/src/transactions/history/evm-transaction-history.ts`
- `packages/web3-evm/src/transactions/history/use-evm-transaction-history.ts`
- `packages/web3-evm/src/transactions/history/pending-receipt-reconciler.tsx`
- `src/components/web3/evm/history/recent-transactions-card.tsx` (presentation, application-owned — 0014)
- `src/features/staking/history/staking-activity.storage.ts` (feature-owned activity store)
- `src/features/staking/hooks/use-staking-write.ts` (ghi cả hai tầng)

Tests:

- `packages/web3-evm/src/transactions/history/evm-transaction-history.storage.test.ts`
- `packages/web3-evm/src/transactions/history/use-evm-transaction-history.test.tsx`
- `src/features/staking/hooks/use-staking-write.test.tsx`
