# 0013 i18n and hydration policy

## Purpose

Server không biết local storage. Đọc locale trực tiếp từ local storage trong initial client render tạo hydration mismatch với server HTML. Document language cũng phải theo locale để hỗ trợ accessibility và browser tooling.

## Decision

- Server render và first client render dùng cùng một deterministic locale.
- `I18nProvider` không đọc local storage trong initial render.
- Stored locale preference chỉ được áp dụng post-mount.
- `document.documentElement.lang` đồng bộ theo active locale.
- Context consumer fail rõ khi được dùng ngoài provider.

Reference shell hiện ship:

- `en`;
- `ja`;
- default `en`.

Danh sách locale là reference configuration và application được phép thay thế hoặc mở rộng.

## Required behavior

- Không đọc local storage trong initial render.
- Stored preference chỉ được đọc post-mount trong `useEffect`, nên có một frame hiển thị default locale.
- Context consumer ném lỗi rõ khi nằm ngoài provider, thay vì fallback im lặng về default locale.
- Thêm locale mới phải cập nhật dictionary và supported locale union trong cùng change.

## Boundaries

- Hydration invariant thuộc foundation.
- Locale list, copy và default product language thuộc application/reference shell.
- Application có thể xóa `ja`, thêm locale mới hoặc đổi default, miễn server và first client render vẫn deterministic.

## Enforcement

- Provider khởi tạo bằng hằng số, không đọc storage.
- Context consumer ném lỗi khi thiếu provider.
- Type system cho locale union và dictionary shape.

## Code and tests

Implementation:

- `src/i18n/config.ts`
- `src/i18n/i18n-provider.tsx`
- `src/i18n/use-translation.ts`
- `src/i18n/dictionaries.ts`
- `src/i18n/dictionaries/en.json`
- `src/i18n/dictionaries/ja.json`
- `src/i18n/language-switcher.tsx`

Tests:

- `src/components/web3/web3-lab.test.tsx`
