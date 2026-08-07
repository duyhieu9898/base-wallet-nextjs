/**
 * Live devnet read check.
 *
 * Proves the runtime against a real cluster, which unit tests cannot: RPC shape,
 * both token programs, cluster identity, and the config the application actually
 * ships. Run with `pnpm solana:smoke [address]`.
 *
 * Reads a well-known devnet account by default, so it needs no key and no
 * funding.
 */

import { loadEnv } from "vite"

import {
  assertSolanaClusterIdentity,
  getDefaultSolanaCluster,
  getSolanaTokensForCluster,
} from "@nln/web3-solana"
import { configureSolanaRuntime } from "@nln/web3-solana/config"
import {
  fetchNativeBalance,
  fetchTokenBalances,
} from "@nln/web3-solana/testing"

// Everything runs inside `main` because `tsx` transpiles to CommonJS, which has
// no top-level await. The config module is imported dynamically so `.env` is in
// `process.env` before it reads anything — it is evaluated at import time.
async function main() {
  Object.assign(process.env, loadEnv("development", process.cwd(), "VITE_"))

  const { solanaRuntimeConfig, DEVNET_GENESIS_HASH } =
    await import("../src/config/solana.config")

  configureSolanaRuntime(solanaRuntimeConfig)

  const cluster = getDefaultSolanaCluster()

  console.log(`cluster        ${cluster.name} (${cluster.key})`)
  console.log(`rpc            ${cluster.rpcUrl}`)

  await assertSolanaClusterIdentity(cluster.key, DEVNET_GENESIS_HASH)
  console.log("genesis hash   matches devnet")

  const account =
    process.argv[2] ?? "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"

  const started = Date.now()
  const native = await fetchNativeBalance(cluster.key, account)
  const tokens = await fetchTokenBalances(cluster.key, account)

  console.log(`account        ${account}`)
  console.log(`native         ${native.raw} lamports (${native.decimals} dp)`)
  console.log(
    `registry       ${getSolanaTokensForCluster(cluster.key).length} token(s)`,
  )

  for (const token of tokens) {
    console.log(
      `  ${token.symbol.padEnd(8)} ${token.raw} (${token.decimals} dp)`,
    )
  }

  console.log(`elapsed        ${Date.now() - started}ms`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
