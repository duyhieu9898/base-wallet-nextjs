/**
 * Single reader for client-exposed configuration.
 *
 * `import.meta.env` is a Vite construct. It exists in the browser bundle, where
 * Vite injects it, and it does not exist under `tsx`, which transpiles the node
 * scripts to CommonJS — `pnpm web3:smoke` imports this same config module and
 * would otherwise read `undefined.VITE_...` and throw at import time.
 *
 * Shimming `import.meta` from the calling script does not work: `import.meta` is
 * per-module, so assigning to it in `scripts/web3-smoke.ts` leaves this module's
 * own `import.meta` untouched. The branch has to live where the read happens.
 *
 * Node scripts load `.env` into `process.env` themselves before importing
 * anything that calls this.
 */
const source: Record<string, string | undefined> =
  typeof import.meta !== "undefined" && import.meta.env
    ? (import.meta.env as unknown as Record<string, string | undefined>)
    : process.env

export function readEnv(key: string): string | undefined {
  return source[key]
}
