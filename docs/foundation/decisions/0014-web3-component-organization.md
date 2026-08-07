# 0014 Web3 component organization

Scope: **family-neutral.** Ranh giới là design-system dependency, không phải
semantics của một chain family — nên nó áp dụng cho mọi family package.
`@nln/web3-evm` là instance hiện tại.

## Purpose

Components mang tên `Web3Lab*` hoặc gắn chặt vào playground không tái sử dụng được trong dApp thật. Playground phải gỡ được khỏi production mà không kéo theo các component sản phẩm.

## Decision

Ranh giới là **design system dependency**, không phải EVM semantics.

```text
Family package (vd @nln/web3-evm)   hook · domain state · type · pure model · state derivation
Application                         mọi presentation render bằng design system
```

Foundation **không export presentation**. Component render bằng `@/components/ui`,
`@/i18n` hoặc bất kỳ design system nào thuộc application:

```text
src/components/web3/evm/   wallet, network, balance, history,
                           transaction forms, transaction presentation
src/components/ui/         generic primitive, không hiểu Web3
src/components/web3/       application-owned presentation và composition
                           — transaction-feedback: provider do application mount
                           — stage-badge: presentation chung
                           — wallet-panel: application composition
                           — web3-lab: development harness
```

### Vì sao đổi so với bản trước

Bản trước đặt component "hiểu trực tiếp EVM semantics" vào `src/web3/evm/components/`.
Điều đó đúng khi chỉ có một application. Với consumer thứ hai — admin — nó sai:
admin **không dùng chung design system** với product app, nên một `BalanceCard`
render bằng `@/components/ui/card` của product app là thứ admin không tái dùng
được, chỉ có thể fork.

Đo được tại thời điểm đổi: 12 file dưới `src/web3/evm/components/` import
`@/components/ui/*` hoặc `@/i18n/use-translation` — tức là toàn bộ. Đây không phải
vài chỗ lỡ tay mà là hệ quả tất yếu của ranh giới cũ.

Điều **không** mất đi: EVM semantics vẫn thuộc foundation. `EvmTransactionReview`,
`EvmFeeEstimate`, `EvmWriteStatus`, `EvmTransactionHistoryStatus` và các derivation
sinh ra chúng vẫn nằm trong package. Component chuyển đi chỉ là lớp render đọc
những model đó — không component nào mang theo logic phái sinh, vì logic đó vốn đã
nằm ở foundation.

`Web3Providers` composition root cũng thuộc application (`src/providers/`): nó
chọn runtime nào được mount và cấp `EvmRuntimeConfig` cho `EvmProvider` (0001).

`web3-lab.tsx` là development composition harness, không phải public application component.

## Required behavior

- Production components dùng domain-oriented names.
- Reusable component không phụ thuộc vào dev lab.
- Dev lab chỉ compose public reusable components.
- Application pages import domain components hoặc feature components, không import toàn bộ dev lab.
- Xóa dev lab không được làm hỏng production component imports.

## Boundaries

- Không dùng prefix `Web3Lab` cho reusable production components.
- Không đặt business-specific feature UI vào foundation component folders.
- Foundation không import `@/components`, `@/i18n` hoặc `@/config` — enforce bằng ESLint, không phải review.
- Foundation không export React component render bằng design system. Export model và derivation; application render.
- Không coi current file tree là immutable public API.
- Component location có thể thay đổi nếu domain ownership vẫn rõ và public imports được migrate có chủ đích.

## Enforcement

- ESLint: `packages/web3-evm/src/**` bị cấm import `@/components`, `@/i18n`, `@/config` — cả alias lẫn relative traversal.
- Fixture test cố tình vi phạm (`src/test/eslint-boundaries.test.ts`): rule không có fixture chứng minh là rule chưa tồn tại.
- Cấu trúc thư mục.
- Composition test cho `web3-lab.tsx`.

## Code and tests

Implementation:

- `src/components/web3/evm/` (presentation, application-owned)
- `src/components/web3/` (application-owned phần còn lại)
- `src/components/web3/web3-lab.tsx`
- `src/providers/web3-providers.tsx`
- `eslint.config.mjs`

Tests:

- `src/components/web3/web3-lab.test.tsx`
- `src/test/eslint-boundaries.test.ts`
