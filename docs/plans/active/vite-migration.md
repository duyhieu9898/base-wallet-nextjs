# Execution Plan: Migrate applications from Next.js to Vite + React

Date: 2026-08-07

## Status

Active

## Outcome

Both applications build and run on Vite + React with TanStack Router, producing
static assets. Next.js is removed from the workspace. No behaviour visible to a
user changes, and no `@nln/web3-evm` source changes.

Observable result: `pnpm dev`, `pnpm build`, `pnpm test:run`, `pnpm test:e2e` all
pass with no `next` dependency in any `package.json`, and `vite build` emits a
`dist/` directory per app.

## Context

Next.js is not being used for what Next.js is for. Measured on `dfb18bf`:

| Signal                                                        | `n-plus` | `n-plus-admin` |
| ------------------------------------------------------------- | -------- | -------------- |
| Pages under `src/app/`                                        | 3        | 18             |
| `next/*` imports in the whole app                             | 5        | 12             |
| API route handlers                                            | 1        | 0              |
| `middleware.ts`                                               | none     | none           |
| `generateMetadata` / `generateStaticParams` / server fetching | none     | none           |

Every `next/*` import in `n-plus` lives inside `src/app/`. `features/`,
`components/`, `i18n/`, `lib/`, `mocks/`, `providers/` and `contracts/` are
already framework-agnostic React.

`@nln/web3-evm` has no `next` dependency and no `next` import — verified. The
package layer is unaffected by this migration, which is also why the framework
choice is independent of how `@nln/web3-solana` gets built.

`n-plus-admin` derives from `shadcn-admin`, which is natively Vite + TanStack
Router. Migrating it is reverting it to its original shape, not inventing a new
one. Reference: `/home/hieund/Documents/BAP/NLN/shadcn-admin`.

SEO and Open Graph previews are confirmed **not required** for either app,
including MLM referral links. That was the only requirement that argued for
keeping server rendering.

## Scope

In scope:

- `apps/n-plus-admin` then `apps/n-plus`: build tooling, routing, entry point,
  fonts, and the handful of `next/*` call sites.
- Playwright e2e configuration and the health-check assertion it depends on.
- Decision `0013` (i18n and hydration), whose premise is server rendering.
- Deployment target change from a Node server to static assets.
- Documentation that references the App Router layout.

Out of scope:

- `packages/web3-evm/` source. Not one line.
- Any product behaviour, business rule, route path visible to users, or design
  system change.
- `@nln/web3-solana`. This migration and that package must not run concurrently.
- Server-side rendering in any form, including prerendering.

## Approach

Admin first: it is the app that was forced into Next, it has the most pages, and
its original upstream is available to diff against. It also has zero SSR-shaped
code beyond one cookie read, so it isolates tooling risk from product risk.

1. **Admin tooling** — add `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`,
   `@tanstack/react-router`, `@tanstack/router-plugin`; drop `next`,
   `@tailwindcss/postcss`, `postcss.config.mjs`. Add `index.html`, `src/main.tsx`,
   `vite.config.ts`.
2. **Admin routing** — App Router tree to TanStack file routes under
   `src/routes/`, preserving every current URL exactly. Route groups `(errors)`
   become the same paths under the generated tree.
3. **Admin layout** — `RootLayout` becomes a root route component. Three
   Next-specific pieces to replace:
   - `cookies()` reading `sidebar_state` → read `document.cookie` on the client,
     matching upstream `shadcn-admin`;
   - `next/font/google` `Inter` → self-hosted `@fontsource/inter`, so the app
     makes no external font request;
   - `export const metadata` → `<title>` in `index.html`.
4. **Admin call sites** — `next/navigation` (7) → TanStack Router equivalents;
   `next/link` (2) → `<Link>` from the router.
5. **Validate admin**, then commit.
6. **Product app tooling and routing** — same shape, 3 routes.
7. **Product app `/api/health`** — the route exists only so an e2e test has
   something to hit. A static SPA has no server to answer it; health checking
   belongs to the host. Drop the route and assert application boot instead.
8. **Playwright** — `webServer.command` from `next dev` to `vite`, port and
   `baseURL` unchanged so no other config moves.
9. **Decision `0013`** — rewrite. Its rule exists because server HTML and first
   client render can disagree about locale. Without a server there is no such
   mismatch, but the first-paint requirement survives; the decision must state
   the SPA rule rather than be deleted.
10. **Documentation and deployment** — update paths that name `src/app/`, and
    record the deployment target change.

## Risks And Recovery

- **Risk: URL drift.** A changed route path breaks bookmarks, the referral link
  flow, and screen-design traceability. Mitigation: enumerate current URLs before
  step 2 and diff the generated route tree against that list; no path may change.
- **Risk: MSW boot order.** `MockProvider` currently mounts inside a server
  layout. In an SPA the worker must start before the first data fetch, not
  alongside it. Mitigation: start MSW in `main.tsx` before `createRoot`, and keep
  the existing e2e as the proof.
- **Risk: doing this while starting `@nln/web3-solana`.** Two structural changes
  at once make a failure unattributable. Mitigation: this plan explicitly blocks
  that overlap; the Solana package waits.
- **Risk: hidden reliance on Next behaviour** — automatic `NEXT_PUBLIC_` env
  inlining differs from Vite's `VITE_`/`import.meta.env`. Mitigation: audit every
  `process.env` read before step 1 concludes; treat this as a gate, not a
  cleanup.
- Recovery: each app is migrated in its own commit on top of a green `main`.
  `git revert` of a single commit restores that app. `packages/web3-evm` is
  untouched throughout, so no revert can affect the runtime package.

## Progress

- [x] 0. Audited env usage — 28 `NEXT_PUBLIC_*` reads, all renamed to `VITE_*`.
- [x] 1. Admin: Vite tooling.
- [x] 2. Admin: routes, URL parity proven by diff.
- [x] 3. Admin: root route, fonts, sidebar cookie.
- [x] 4. Admin: `next/navigation` and `next/link` call sites.
- [x] 5. Admin: validated and committed (`5b6f4da`).
- [x] 6. Product: Vite tooling and routes.
- [x] 7. Product: `/api/health` dropped, e2e asserts client boot.
- [x] 8. Playwright configuration.
- [x] 9. Decision `0013` rewritten for a static bundle.
- [x] 10. Documentation updated; `next` and `eslint-config-next` removed workspace-wide.

## Decisions

- 2026-08-07: Router is **TanStack Router**, file-based, with
  `@tanstack/router-plugin` and a generated `routeTree.gen.ts`. Reason: the admin
  app originates from `shadcn-admin`, which uses exactly this; adopting it is
  reverting rather than choosing. The product app uses the same router so the two
  apps do not diverge in routing model.
- 2026-08-07: Fonts are self-hosted via `@fontsource/*` rather than a CDN import.
  `next/font/google` self-hosted automatically; a naive CSS `@import` would
  silently reintroduce an external request on every page load.
- 2026-08-07: No prerendering, no SSG, no SSR. Confirmed with the user that SEO
  and Open Graph previews are not required. If that changes, it is a new decision,
  not a configuration tweak.
- 2026-08-07: `/api/health` is removed rather than reimplemented. A static bundle
  has no server; a health endpoint served by the CDN would prove only that the CDN
  is up, which the CDN already reports.

## Validation

- Focused proof: `pnpm --filter <app> typecheck`, `lint`, `test:run` per app as
  each is migrated.
- Integration proof: `pnpm test:e2e` against the Vite dev server; the current
  route list matches the generated route tree exactly.
- Repository-required checks: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`,
  `pnpm test:run`, `pnpm build`.
- Negative proof: `grep -rn "\"next\"" apps/*/package.json` returns nothing, and
  no `next/*` import remains in any app.

## Result

Complete, pending review. Two commits: `5b6f4da` (admin), plus the product app
and workspace cleanup.

Delivered:

- No `next` dependency, no `next/*` import, no `next.config.*`, no
  `next-env.d.ts`, no API route anywhere in the repository.
- Both apps build to static assets with Vite and route with TanStack Router.
- Admin URL parity proven: the generated route tree diffed against the App Router
  paths is identical across all 18 routes.
- `eslint-config-next` replaced with `@eslint/js` + `typescript-eslint` +
  `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`. The boundary rules
  that enforce the architecture were preserved, and `src/test/eslint-boundaries.test.ts`
  proves it — that suite exists to fail if the rules stop being enforced.

Found and fixed while migrating, not caused by it:

- Three zero-width spaces (U+200B) embedded in source comments, invisible until
  `no-irregular-whitespace` — a rule `eslint-config-next` did not enable — started
  running.
- A `no-useless-assignment` in an admin mock handler.
- `apps/n-plus/tsconfig.json` had excluded gitignored `scripts/**/*.local.ts`;
  that exclusion was briefly lost and restored.

Known limitation, deliberately not fixed:

- The `/web3-lab` route chunk is still emitted in the production build. The
  `beforeLoad` gate is a runtime check, so the lab never renders and its chunk is
  never fetched in production, but the asset exists. Excluding it from the output
  needs a build-level exclusion. It contains development UI only, no secrets.

Validation:

- `pnpm typecheck`, `pnpm lint` (0 errors), `pnpm format:check`, `pnpm test:run`
  (568 tests) and `pnpm build` all pass.
- `pnpm --filter n-plus test:e2e` — 2 passed against the Vite dev server.
- Negative proof: no `NEXT_PUBLIC` and no `next` import remains in any `src/`,
  `scripts/`, `contracts/` or `e2e/` directory.

Follow-up, not in this plan:

- Deployment configuration still has to change from a Node server to static
  hosting; the repository holds no deployment manifest, so there was nothing to
  edit here.
- `pnpm web3:smoke` and `staking:deploy-sepolia` now load env through Vite's
  `loadEnv`. Neither was executed — both require live RPC and funded keys.
