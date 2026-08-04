# 0014 Web3 component organization

## Purpose

Components mang tên `Web3Lab*` hoặc gắn chặt vào playground không tái sử dụng được trong dApp thật. Playground phải gỡ được khỏi production mà không kéo theo các component sản phẩm.

## Decision

Reusable Web3 components được tổ chức theo domain responsibility dưới `src/components/web3/`.

Các domain hiện tại có thể bao gồm:

- wallet;
- network;
- balance;
- history;
- transaction forms;
- shared transaction presentation.

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

- `src/components/web3/`
- `src/components/web3/web3-lab.tsx`

Tests:

- `src/components/web3/web3-lab.test.tsx`
