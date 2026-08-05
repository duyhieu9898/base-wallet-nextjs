# NLN Frontend

NLN Frontend is a Next.js Web3 foundation with an EVM runtime and an
application-level SIWE authentication example. Reusable blockchain behavior is
kept separate from application features and policy.

## Related repository

The standalone administration UI lives in the sibling
[`nln-admin`](../nln-admin) repository. It is a React/Vite application and does
not depend on this Web3 foundation.

## Documentation

Start with [`docs/README.md`](docs/README.md). For an application feature, read
the relevant product or application decision first, then only the foundation
capability, extension contract, and decision needed by that feature.

## Development

This repository uses pnpm.

```bash
pnpm dev
pnpm check
```

Useful focused commands are `pnpm typecheck`, `pnpm lint`, `pnpm test:run`, and
`pnpm test:e2e`.
