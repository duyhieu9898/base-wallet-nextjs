/**
 * Live RPC smoke entry for this application.
 *
 * Thin on purpose. The checks live in `@nln/web3-evm/testing` because they
 * verify the foundation; what belongs here is everything the foundation must not
 * know: which `.env.local` to read, which networks are configured, and how the
 * result is printed and turned into an exit code (execution plan §8.3).
 *
 * It is also the second consumer proving the §4.1 acceptance criterion — it
 * configures the foundation from outside without editing a line inside it.
 */

import { loadEnv } from "vite"

import { configureEvmRuntime } from "@nln/web3-evm/config"
import { runEvmSmoke } from "@nln/web3-evm/testing"

/**
 * `--chainId <id>` limits the run to a single network. Omitted runs the whole
 * registry, mainnet included.
 */
function parseChainIdArg(argv: readonly string[]): number | null {
  const index = argv.indexOf("--chainId")
  if (index === -1) return null

  const raw = argv[index + 1]
  const parsed = Number(raw)
  if (!raw || !Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `--chainId requires a positive integer chain ID, received "${raw ?? ""}".`,
    )
  }
  return parsed
}

async function main() {
  // Same loader and same precedence Vite itself uses, so this script verifies
  // the configuration the app actually runs with. `pnpm --filter n-plus`
  // invokes it from the app directory, which is the project dir it wants.
  //
  // The app reads configuration from `import.meta.env`, which Vite replaces at
  // build time and Node does not define at all. Populating it here is what lets
  // one config module serve both the bundle and this script.
  const env = loadEnv(
    process.env.NODE_ENV ?? "development",
    process.cwd(),
    "VITE_",
  )
  const meta = import.meta as unknown as { env?: Record<string, string> }
  meta.env = { ...(meta.env ?? {}), ...env }

  // Imported after the env is loaded: the config parses environment variables at
  // module scope, so importing it earlier would read an empty environment.
  const { evmRuntimeConfig } = await import("../src/config/web3.config")
  configureEvmRuntime(evmRuntimeConfig)

  const summary = await runEvmSmoke({
    onlyChainId: parseChainIdArg(process.argv.slice(2)),
    log: (message) => console.log(message),
    logError: (message) => console.error(message),
  })

  console.log("")
  console.log("Summary:")
  console.log(
    `  Networks checked: ${summary.networksChecked} (Passed: ${summary.networksPassed}, Failed: ${summary.networksFailed})`,
  )
  console.log(`  Tokens checked: ${summary.tokensChecked}`)
  console.log(`  Balance checks: ${summary.balanceChecks}`)
  console.log(`  Allowance checks: ${summary.allowanceChecks}`)

  process.exitCode = summary.networksFailed > 0 ? 1 : 0
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
