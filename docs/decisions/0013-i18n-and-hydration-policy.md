# 0013 i18n and first-paint policy

## Purpose

Locale preference lives in local storage, which is not readable before the app
mounts. Reading it during the initial render used to cause a hydration mismatch
against server HTML; the applications are now static bundles with no server
render, so that specific mismatch cannot occur.

The requirement that survives is about **first paint**, not hydration: the first
frame must be deterministic, and the document language must follow the active
locale for accessibility and browser tooling.

## Decision

- The first render uses a deterministic default locale, not a value read from
  storage.
- `I18nProvider` does not read local storage during the initial render.
- Stored locale preference is applied post-mount.
- `document.documentElement.lang` follows the active locale.
- A context consumer fails loudly when used outside its provider.

The reference shell ships:

- `en`;
- `ja`;
- default `en`.

The locale list is reference configuration; an application may replace or extend
it.

## Required behavior

- Do not read local storage during the initial render.
- Read the stored preference post-mount in `useEffect`, so exactly one frame
  shows the default locale.
- A context consumer throws a clear error outside its provider rather than
  silently falling back to the default locale.
- Adding a locale updates the dictionary and the supported-locale union in the
  same change.

## Boundaries

- The deterministic-first-render invariant belongs to the application shell, not
  to a chain-family package. No `@nln/web3-*` package renders text.
- Locale list, copy and default product language belong to the
  application/reference shell.
- An application may remove `ja`, add a locale or change the default, as long as
  the first render stays deterministic.
- If an application ever reintroduces server rendering or prerendering, this
  decision returns to being a hydration invariant and the server and first client
  render must agree. That is a change of premise and must be recorded here, not
  assumed.

## Enforcement

- The provider initialises from a constant and does not read storage.
- The context consumer throws when its provider is missing.
- The type system covers the locale union and dictionary shape.

## Code and tests

Implementation:

- `apps/n-plus/src/i18n/config.ts`
- `apps/n-plus/src/i18n/i18n-provider.tsx`
- `apps/n-plus/src/i18n/use-translation.ts`
- `apps/n-plus/src/i18n/dictionaries.ts`
- `apps/n-plus/src/i18n/dictionaries/en.json`
- `apps/n-plus/src/i18n/dictionaries/ja.json`
- `apps/n-plus/src/i18n/language-switcher.tsx`

Tests:

- `apps/n-plus/src/components/web3/web3-lab.test.tsx`
