# 0014 Web3 component organization

## Purpose

Components mang tên `Web3Lab*` hoặc gắn chặt vào playground không tái sử dụng được trong dApp thật. Playground phải gỡ được khỏi production mà không kéo theo các component sản phẩm.

## Decision

Component hiểu trực tiếp EVM semantics thuộc về EVM runtime, không thuộc
application:

```text
src/web3/evm/components/   wallet, network, balance, history,
                           transaction forms, shared transaction presentation
```

Chúng được tiêu thụ qua public boundary `@/web3/evm`, không qua deep import.

Application giữ những gì không phải EVM primitive:

```text
src/components/ui/         generic primitive, không hiểu Web3
src/components/web3/       application-owned presentation
                           — transaction-feedback: provider do application mount
                           — stage-badge: presentation chung
                           — wallet-panel: application composition
                           — web3-lab: development harness
```

Ranh giới phân định là **ai sở hữu ngữ nghĩa**, không phải component có nằm dưới
`src/components/` hay không: một component đọc `EvmWriteStatus` hoặc review model
thuộc EVM; một provider do application composition root mount thì không.

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
- Không coi current file tree là immutable public API.
- Component location có thể thay đổi nếu domain ownership vẫn rõ và public imports được migrate có chủ đích.

## Enforcement

- Cấu trúc thư mục.
- Review policy về đặt tên và vị trí component.
- Composition test cho `web3-lab.tsx`.

## Code and tests

Implementation:

- `src/web3/evm/components/`
- `src/components/web3/` (application-owned phần còn lại)
- `src/components/web3/web3-lab.tsx`

Tests:

- `src/components/web3/web3-lab.test.tsx`
