import js from "@eslint/js"
import { defineConfig, globalIgnores } from "eslint/config"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import globals from "globals"
import tseslint from "typescript-eslint"

/**
 * Public boundary of Web3 foundation.
 *
 * Applications and features import runtime APIs from `@/web3/evm`. Three further
 * public subpaths exist, each for a reason the main barrel cannot serve:
 *
 * - `@/web3/evm/address` — pure leaf, React-free and wagmi-free
 * - `@/web3/evm/errors`  — pure leaf, React-free and wagmi-free
 * - `@/web3/evm/config`  — runtime config injection, React-free and wagmi-free, so
 *   bootstrap and test setup can install a config without instantiating hooks
 * - `@nln/web3-evm/registry` — pure registry read selectors (explorer URLs, network
 *   lookups), React-free and wagmi-free, so an admin deployment that never mounts a
 *   provider can link a hash to its explorer without depending on wagmi
 * - `@nln/web3-evm/testing` — live verification of the package itself
 * - `@nln/web3-evm/provider` — mount point. `EvmProvider` is deliberately outside the
 *   main barrel so importing a hook does not pull a Wagmi client into the graph,
 *   but the application composition root still needs a public path to it.
 *
 * See `packages/web3-evm/src/index.ts` and `docs/foundation/evm/EXTENSION_CONTRACT.md`.
 */
const WEB3_PUBLIC_PATHS = [
  "@nln/web3-evm",
  "@nln/web3-evm/address",
  "@nln/web3-evm/errors",
  "@nln/web3-evm/errors/adapter",
  "@nln/web3-evm/contracts",
  "@nln/web3-evm/registry",
  "@nln/web3-evm/config",
  "@nln/web3-evm/provider",
  "@nln/web3-evm/testing",
]

/**
 * Public boundary of the Solana runtime.
 *
 * Same rule, separate list — the two runtimes are siblings, and a shared list
 * would imply a shared surface they do not have. The Solana package exposes no
 * `provider`, `testing` or `contracts` leaf yet because none exists; add the
 * path here when the module lands, not before.
 */
const WEB3_SOLANA_PUBLIC_PATHS = [
  "@nln/web3-solana",
  "@nln/web3-solana/address",
  "@nln/web3-solana/errors",
  "@nln/web3-solana/registry",
  "@nln/web3-solana/config",
  "@nln/web3-solana/provider",
  "@nln/web3-solana/testing",
]

const web3DeepImportPatterns = [
  {
    group: [
      "@/web3/evm/*",
      "@/web3/evm/**",
      "@nln/web3-evm/*",
      "@nln/web3-evm/**",
      "@/web3/core",
      "@/web3/core/*",
      "@/web3/core/**",
      ...WEB3_PUBLIC_PATHS.map((path) => `!${path}`),
    ],
    message:
      "EVM internals are private. Import from @nln/web3-evm (runtime API), or one of the public subpaths: @nln/web3-evm/address, @nln/web3-evm/errors, @nln/web3-evm/errors/adapter, @nln/web3-evm/contracts, @nln/web3-evm/registry, @nln/web3-evm/config, @nln/web3-evm/provider.",
  },
  {
    group: [
      "@nln/web3-solana/*",
      "@nln/web3-solana/**",
      ...WEB3_SOLANA_PUBLIC_PATHS.map((path) => `!${path}`),
    ],
    message:
      "Solana internals are private. Import from @nln/web3-solana (runtime API), or one of the public subpaths: @nln/web3-solana/address, @nln/web3-solana/errors, @nln/web3-solana/registry, @nln/web3-solana/config, @nln/web3-solana/provider, @nln/web3-solana/testing.",
  },
]

/**
 * Application surfaces the foundation must not reach into.
 *
 * Covers alias imports and relative traversal both: `@/components/ui/button` and
 * `../../../components/ui/button` resolve to the same file, and a rule that only
 * knows the alias is a rule a refactor walks straight through.
 */
const APPLICATION_SURFACES = ["components", "i18n", "config"]

const applicationSurfacePatterns = APPLICATION_SURFACES.flatMap((surface) => [
  `@/${surface}`,
  `@/${surface}/*`,
  `@/${surface}/**`,
  `../${surface}/**`,
  `../**/${surface}/**`,
])

/**
 * Shared-component boundary.
 *
 * `apps/<app>/src/components/` is the pool a future shared UI package draws from, so
 * a component there must not know which application it is in. The mechanical test
 * is imports: `@/features`, `@/config` and `@/context` are per-application, and a
 * second console has different ones.
 *
 * This is a guard rail, not a promotion. No package is approved yet — the
 * condition in `package-scope-evidence.md` is a second implemented consumer, and
 * there is one admin app. The rule exists so the pool stays clean for free
 * instead of being re-cleaned later, when the drift is spread across dozens of
 * files and nobody remembers which ones were deliberate.
 *
 * Three files are exempt because composing the application *is* their job: the
 * shell wires auth and layout state, the sidebar supplies its navigation data,
 * and the footer reads the signed-in operator. Adding a fourth exemption should
 * mean the file belongs in `features/`, not that the list should grow.
 */
const sharedComponentAppSurfaces = ["features", "config", "context"].flatMap(
  (surface) => [`@/${surface}`, `@/${surface}/*`, `@/${surface}/**`],
)

/**
 * Cross-application imports (§2.3).
 *
 * In most repositories `apps/a -> apps/b` is physically impossible. In a workspace
 * `../../n-plus-admin/src/features/x` resolves for real, so the monorepo is
 * the first thing that makes this anti-pattern reachable — and the pair most at
 * risk is a product app and its own admin, which share a domain and a contract and
 * sit next to each other. They do not share a deployment or a permission model,
 * and one cross-import puts admin code in a public bundle.
 */
const crossAppPattern = {
  group: [
    "../../*/src/**",
    "../../../*/src/**",
    "../../../../*/src/**",
    "@nln/n-plus*",
    "@nln/neura-link*",
  ],
  message:
    "Applications must not import each other, and a product app must not import its admin (§2.3). They have different deployments and permission models. Share through @nln/web3-evm, or duplicate deliberately.",
}

/**
 * Application surfaces no foundation package may reach into, in either family.
 */
const foundationApplicationPattern = {
  group: [
    "@/features",
    "@/features/*",
    "@/features/**",
    "@/app",
    "@/app/*",
    "@/app/**",
    "@/contracts",
    "@/contracts/*",
    "@/contracts/**",
  ],
  message:
    "Web3 foundation must not import application features, routes, or contract registries. Foundation must be reusable in other dApps.",
}

const eslintConfig = defineConfig([
  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,tsx,mts,mjs}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // A route or config module legitimately exports a `Route` object beside its
      // component; the allowance keeps HMR warnings on real mixed modules only.
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },

  // Dependency direction and sibling isolation, one block per foundation
  // package.
  //
  // Both concerns share a block on purpose. Flat config resolves a rule by its
  // key, so a later block naming `no-restricted-imports` for overlapping files
  // *replaces* an earlier one instead of adding to it. Expressing these as a
  // generic `packages/*/**` block plus per-package blocks reads fine and
  // silently disables the generic half for every package that has its own.
  //
  // Sibling isolation is the load-bearing half. `@nln/web3-evm` and
  // `@nln/web3-solana` are siblings, not layers, and neither imports the other
  // in either direction. Without the rule the first "just reuse the EVM address
  // helper" import creates exactly the coupling `web3-core` was rejected to
  // avoid, and it passes review because the import looks ordinary.
  {
    files: ["packages/web3-evm/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            foundationApplicationPattern,
            {
              group: ["@nln/web3-solana", "@nln/web3-solana/**"],
              message:
                "Chain-family runtimes are siblings and must not import each other. No shared/core package is approved — see docs/foundation/package-scope-evidence.md.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/web3-solana/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            foundationApplicationPattern,
            {
              group: ["@nln/web3-evm", "@nln/web3-evm/**"],
              message:
                "Chain-family runtimes are siblings and must not import each other. No EVM type crosses into the Solana runtime — see docs/foundation/solana-runtime-requirement.md.",
            },
          ],
        },
      ],
    },
  },

  // Foundation must not depend on the application's design system, i18n or config.
  //
  // Scoped to `src/web3/evm/**` rather than `src/web3/**`: `web3-providers.tsx` is
  // the application's composition root, and it is supposed to know the app config
  // it hands to EvmProvider (execution plan §8.3).
  //
  // ERROR. It landed as a warning to inventory the violations (42 across 12 files),
  // all of which plan §4.3 moved to the application; there is nothing left to
  // grandfather, so a new violation should stop a build rather than scroll past.
  //
  // Uses the typescript-eslint variant so it can carry its own severity separately
  // from the base `no-restricted-imports` rule above.
  {
    files: ["packages/web3-evm/src/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: applicationSurfacePatterns,
              message:
                "Web3 foundation must not import application components, i18n or config. Presentation belongs to the application; the foundation exports hooks, domain state, models and derivation. A second consumer does not share this design system.",
            },
          ],
        },
      ],
    },
  },

  // App isolation (§2.3). Now enforceable, because apps/ exists.
  {
    files: ["apps/*/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        { patterns: [crossAppPattern] },
      ],
    },
  },

  // Feature isolation: a feature module must be copyable to another application on
  // its own. This is already true today — the rule locks it in before two new team
  // members start adding features, rather than after.
  //
  // Uses the typescript-eslint variant so it survives the later block below, which
  // sets the base `no-restricted-imports` rule for the same files — in flat config
  // the later entry replaces the rule outright rather than merging with it.
  {
    files: ["apps/*/src/features/auth/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            // Repeated on purpose: this entry replaces the app-isolation block
            // above for these files rather than merging with it.
            crossAppPattern,
            {
              group: [
                "@/features/staking",
                "@/features/staking/*",
                "@/features/staking/**",
                "../staking/**",
                "../**/staking/**",
              ],
              message:
                "Feature modules must not import each other. Share through the foundation (@/web3/evm) or through the application composing both.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/*/src/features/staking/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            // Repeated on purpose: this entry replaces the app-isolation block
            // above for these files rather than merging with it.
            crossAppPattern,
            {
              group: [
                "@/features/auth",
                "@/features/auth/*",
                "@/features/auth/**",
                "../auth/**",
                "../**/auth/**",
              ],
              message:
                "Feature modules must not import each other. Share through the foundation (@/web3/evm) or through the application composing both.",
            },
          ],
        },
      ],
    },
  },

  // Application and features must only use the public boundary.
  {
    files: [
      "apps/*/src/features/**/*.{ts,tsx}",
      "apps/*/src/components/**/*.{ts,tsx}",
      "apps/*/src/app/**/*.{ts,tsx}",
      // `routes` and `pages` are the TanStack equivalents of the old `app`
      // directory and were missed when the App Router glob was carried over.
      // They are where a Vite application's screens actually live, so the rule
      // was blind to its largest surface.
      "apps/*/src/routes/**/*.{ts,tsx}",
      "apps/*/src/pages/**/*.{ts,tsx}",
      "apps/*/src/providers/**/*.{ts,tsx}",
      "apps/*/src/contracts/**/*.{ts,tsx}",
      "apps/*/src/lib/**/*.{ts,tsx}",
      "apps/*/src/hooks/**/*.{ts,tsx}",
      "apps/*/src/mocks/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": ["error", { patterns: web3DeepImportPatterns }],
    },
  },

  // UI layer must not submit transactions directly.
  //
  // Feature hooks ARE allowed to call Wagmi's write hooks for their own contracts
  // (decision 0015) — provided they go through `useEvmWriteLifecycle`. That constraint
  // is protected by tests and review policy, not by linting.
  {
    files: [
      "apps/*/src/features/**/components/**/*.{ts,tsx}",
      "apps/*/src/components/**/*.{ts,tsx}",
      "apps/*/src/app/**/*.{ts,tsx}",
      "apps/*/src/routes/**/*.{ts,tsx}",
      "apps/*/src/pages/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: web3DeepImportPatterns,
          paths: [
            {
              name: "wagmi",
              importNames: ["useWriteContract", "useSendTransaction"],
              message:
                "UI layer does not submit transactions directly. Use public write hooks from @/web3/evm, or a feature hook that goes through useEvmWriteLifecycle.",
            },
          ],
        },
      ],
    },
  },

  // Shared components must not know which application they are in.
  //
  // Last on purpose, and on the `@typescript-eslint` rule name: three earlier
  // blocks set `no-restricted-imports` for these same files, and flat config
  // replaces rule options rather than merging them, so an earlier block would be
  // silently overwritten (see the note above). `crossAppPattern` is repeated here
  // for the same reason — this block supersedes the one that applied it.
  {
    files: ["apps/*/src/components/**/*.{ts,tsx}"],
    ignores: [
      "apps/*/src/components/layout/authenticated-layout.tsx",
      "apps/*/src/components/layout/app-sidebar.tsx",
      "apps/*/src/components/layout/nav-user.tsx",
      // Composing features is what this file is for — decision 0014 calls it a
      // development composition harness, not a public application component.
      "apps/*/src/components/web3/web3-lab.tsx",
    ],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            crossAppPattern,
            {
              group: sharedComponentAppSurfaces,
              message:
                "A component under src/components/ must not import application state — it is the pool a shared UI package draws from, and a second app has different features, config and context. Take what it needs as props, or move it to src/features/ if it is business logic. Exempt: authenticated-layout, app-sidebar, nav-user.",
            },
          ],
        },
      ],
    },
  },

  // A TanStack route module must export `Route` beside its component — that is
  // the shape createFileRoute requires, not an oversight. The warning cannot be
  // acted on there, so it would train people to ignore it everywhere else.
  {
    files: ["apps/*/src/routes/**/*.tsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },

  // Build-output and generated-file ignores.
  globalIgnores([
    // Build output lives under each app, and lint-staged passes explicit paths,
    // which bypasses ESLint's default skipping of dot-directories.
    "**/out/**",
    "**/build/**",
    // Vite build output.
    "**/dist/**",
    // Generated by @tanstack/router-plugin from the files in src/routes.
    "**/routeTree.gen.ts",
    // Generated assets: MSW worker (mockServiceWorker.js) and static SVGs.
    "apps/*/public/**",
    "**/playwright-report/**",
    "**/test-results/**",
  ]),
])

export default eslintConfig
