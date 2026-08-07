import type { Chain } from "viem"
import { mainnet, sepolia } from "viem/chains"

import {
  configureEvmRuntime,
  createEvmRuntimeConfig,
  isEvmRuntimeConfigured,
  type EvmNetworkConfig,
  type EvmRuntimeConfig,
} from "@nln/web3-evm/config"

/**
 * Application-owned Web3 configuration for the admin console.
 *
 * The admin console never connects a wallet and mounts no `EvmProvider`. It reads
 * chain metadata for exactly one purpose: turning a wallet address or transaction
 * hash stored by the backend into a block-explorer link.
 *
 * Unlike the product application, admin is **single-chain per deployment**. There
 * is no network switcher and no per-record chain: `NEXT_PUBLIC_APP_ENV` decides
 * the chain, so a production deployment links to mainnet and every other
 * deployment links to testnet. The registry therefore gets exactly one network
 * installed — a registry holding chains this deployment can never show is a
 * second source of truth for a question that already has one answer.
 *
 * The variable is deliberately not `NODE_ENV`: Next.js owns that one (`next dev`
 * sets `development`, `next build`/`next start` set `production`) and `.env`
 * cannot override it, which would make every built deployment mainnet and leave a
 * staging deployment no way to read testnet.
 */

export type AdminAppEnv = "production" | "development"

/**
 * Chain per deployment environment.
 *
 * Unset resolves to testnet — the fail-safe direction for a missing variable. A
 * value that is set but unrecognized throws at boot instead: `"prod"` silently
 * resolving to testnet would point a production console at an explorer where
 * none of its records exist, and an audit screen gives the reader no way to
 * notice the links are wrong.
 */
export function resolveAdminChain(appEnv: string | undefined): Chain {
  if (appEnv === undefined || appEnv.trim() === "") return sepolia

  switch (appEnv) {
    case "production":
      return mainnet
    case "development":
      return sepolia
    default:
      throw new Error(
        `NEXT_PUBLIC_APP_ENV="${appEnv}" is not recognized. Expected "production" or "development".`,
      )
  }
}

export const adminChain: Chain = resolveAdminChain(import.meta.env.VITE_APP_ENV)

/**
 * `tokens` is empty on purpose: explorer URLs come from `chain.blockExplorers`,
 * and the admin console reads no balances, so a token registry here would be
 * configuration nothing consumes.
 */
const adminNetwork: EvmNetworkConfig = Object.freeze({
  key: adminChain.testnet ? `${adminChain.name}-testnet` : adminChain.name,
  family: "evm" as const,
  chain: adminChain,
  tokens: {},
  faucets: Object.freeze([]),
})

export const evmRuntimeConfig: EvmRuntimeConfig = createEvmRuntimeConfig({
  networks: [adminNetwork],
  defaultChainId: adminChain.id,
})

/**
 * Install the registry once per module graph.
 *
 * Registry selectors are module-scoped plain functions, not React context, so a
 * component importing them needs the config installed before it renders. Calling
 * this from the module top-level of every consumer keeps that ordering true in
 * the App Router, in tests, and in server components alike.
 */
export function ensureEvmRuntimeConfigured(): EvmRuntimeConfig {
  if (isEvmRuntimeConfigured()) return evmRuntimeConfig
  return configureEvmRuntime(evmRuntimeConfig)
}

export const web3Config = {
  chainId: adminChain.id,
  chainName: adminChain.name,
}
