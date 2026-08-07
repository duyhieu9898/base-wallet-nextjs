# NLN Frontend Monorepo

NLN Frontend is a pnpm monorepo hosting the shared EVM foundation package (`@nln/web3-evm`) and applications across the NLN ecosystem. Reusable Web3 infrastructure is encapsulated within `@nln/web3-evm`, separate from host application policy and presentation UI.

---

## Repository Architecture

```text
.
├── packages/
│   └── web3-evm/              # Shared EVM foundation package (@nln/web3-evm)
├── apps/
│   ├── n-plus/                # Product application (N+ System)
│   └── n-plus-admin/          # Operator console for N+
│       ├── src/features/      # Product features (auth, staking, ...)
│       ├── src/components/    # UI components and presentation panels
│       ├── src/providers/     # Application provider composition root
│       ├── src/app/           # Next.js App Router pages & API routes
│       └── contracts/         # Solidity test fixture and its tooling
├── scripts/                   # Workspace tooling (live RPC smoke entry)
└── docs/                      # Architectural decisions, foundation specs, and plans
    ├── ARCHITECTURE.md        # Application architecture: which app adopts which runtime
    └── foundation/
        ├── ARCHITECTURE.md            # Family-neutral foundation rules
        ├── EXTENSION_CONTRACT.md
        ├── FEATURE_MODULE_CONTRACT.md
        └── evm/                       # The EVM runtime: architecture, contracts,
                                       # adoption guide and EVM decisions
```

The root `package.json` carries tooling only — formatting, linting, git hooks and
the TypeScript runner. Runtime dependencies belong to the app that uses them, so
adding an app dependency at the root is the one thing that breaks the isolation
this layout exists for.

---

## Documentation

Start with [`docs/README.md`](docs/README.md):

- **Application architecture**: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — which app adopts which runtime
- **Foundation architecture**: [`docs/foundation/ARCHITECTURE.md`](docs/foundation/ARCHITECTURE.md) — family-neutral
- **EVM runtime**: [`docs/foundation/evm/ARCHITECTURE.md`](docs/foundation/evm/ARCHITECTURE.md)
- **Extension Contract**: [`docs/foundation/EXTENSION_CONTRACT.md`](docs/foundation/EXTENSION_CONTRACT.md)
- **Feature Module Contract**: [`docs/foundation/FEATURE_MODULE_CONTRACT.md`](docs/foundation/FEATURE_MODULE_CONTRACT.md)

---

## Development & Verification

This repository requires **pnpm**.

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev

# Package-isolated foundation tests
pnpm --filter @nln/web3-evm test:run

# App-isolated build
pnpm --filter n-plus build

# Workspace-wide static and unit checks
pnpm typecheck
pnpm lint
pnpm test:run

# Production build
pnpm build

# Live RPC smoke verification
pnpm web3:smoke
```
