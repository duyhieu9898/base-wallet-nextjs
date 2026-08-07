/**
 * Mount point for the Solana runtime.
 *
 * Deliberately outside the main barrel (`@nln/web3-solana/provider`), same as
 * `EvmProvider`: importing a read hook must not pull a `Connection` and the
 * wallet adapter into the module graph.
 *
 * ## No wallet adapter list
 *
 * `wallets` is passed empty on purpose. `@solana/wallet-adapter-react` depends
 * on `@solana/wallet-standard-wallet-adapter-react`, so any wallet implementing
 * the Wallet Standard — Phantom, Solflare, Backpack — registers itself. Listing
 * adapters explicitly would add a package per wallet and, worse, would make the
 * supported set a build-time constant that goes stale as wallets ship.
 *
 * ## Ordering
 *
 * `configureSolanaRuntime` runs inside a lazy `useState` initializer, matching
 * `EvmProvider`: once per mount, during this component's render, before any
 * child hook reads the registry, and never at module import. An effect would
 * leave the first render of every child reading an unconfigured runtime.
 *
 * The install is unconditional. Skipping it when a config is already present
 * would make the `runtimeConfig` prop silently inert whenever something else
 * configured first — a test setup, or a second provider — and the resulting
 * "why is it reading the wrong cluster" is very hard to trace.
 */

import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react"
import { useMemo, useState, type ReactNode } from "react"

import { getSolanaCluster } from "../chain/registry/solana-registry.adapter"
import type { SolanaClusterKey } from "../chain/registry/solana-registry.types"
import {
  configureSolanaRuntime,
  type SolanaRuntimeConfig,
} from "../chain/registry/solana-runtime-config"
import { SOLANA_READ_COMMITMENT } from "../clients/create-solana-connection"

export type SolanaProviderProps = {
  runtimeConfig: SolanaRuntimeConfig
  /** Defaults to the registry's default cluster. */
  cluster?: SolanaClusterKey
  /**
   * Reconnect to the previously selected wallet on load.
   *
   * Defaults to `false`. `true` makes the wallet pop up on first paint for a
   * returning user, which reads as the site demanding a connection before
   * showing anything.
   */
  autoConnect?: boolean
  children: ReactNode
}

export function SolanaProvider({
  runtimeConfig,
  cluster,
  autoConnect = false,
  children,
}: SolanaProviderProps) {
  // Render-phase install, once per mount. See the ordering note above.
  const [endpoint] = useState(() => {
    configureSolanaRuntime(runtimeConfig)

    // Resolved after the install, because the lookup reads the registry that
    // the install just put in place.
    return getSolanaCluster(cluster ?? runtimeConfig.defaultCluster).rpcUrl
  })

  // Empty and stable: a fresh array each render would make the adapter context
  // re-evaluate its wallet list on every parent render.
  const wallets = useMemo(() => [], [])

  return (
    <ConnectionProvider
      endpoint={endpoint}
      config={{ commitment: SOLANA_READ_COMMITMENT }}
    >
      <WalletProvider wallets={wallets} autoConnect={autoConnect}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  )
}
