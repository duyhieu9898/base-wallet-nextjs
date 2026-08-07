/**
 * Single reader for client-exposed configuration.
 *
 * Branches at the point of read rather than at import: `import.meta.env` is a
 * Vite construct that exists in the browser bundle but not under `tsx`, which
 * transpiles node scripts to CommonJS. Any smoke script importing this module
 * would otherwise read `undefined.VITE_...` and throw at import time.
 *
 * Shimming `import.meta` from the calling script does not work — it is
 * per-module, so assigning to it elsewhere leaves this module's own untouched.
 */
const source: Record<string, string | undefined> =
  typeof import.meta !== "undefined" && import.meta.env
    ? (import.meta.env as unknown as Record<string, string | undefined>)
    : process.env

export function readEnv(key: string): string | undefined {
  return source[key]
}

export function requireEnv(key: string): string {
  const value = readEnv(key)

  if (!value) {
    throw new Error(
      `Missing required environment variable ${key}. See .env.example.`,
    )
  }

  return value
}
