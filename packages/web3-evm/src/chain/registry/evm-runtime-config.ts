/**
 * Runtime configuration injected by the consumer (decision 0001).
 *
 * The foundation owns the *schema* and its validation; the application owns the
 * *data* — which networks are supported, which tokens exist on them, which RPC
 * URL each one uses, and which chain is the default. No environment variable
 * name and no production network is known inside this package.
 *
 * There is exactly one representation of a network: `EvmNetworkConfig` already
 * carries `tokens` and `rpcUrlOverride`, so this type deliberately does NOT add
 * parallel token/RPC maps. Two sources for the same data drift silently.
 *
 * `ssr` is not here on purpose: it is a React/Wagmi hosting concern, not chain
 * metadata. It travels through `EvmProviderOptions` instead.
 */

import { createEvmWeb3Error } from "../../errors/evm-errors"
import type { EvmNetworkConfig } from "./evm-registry.types"

export type EvmRuntimeConfig = Readonly<{
  networks: readonly EvmNetworkConfig[]
  defaultChainId: number
}>

/**
 * Validate and freeze consumer configuration.
 *
 * Fails at construction rather than at the first RPC call: a duplicated chain or
 * a default chain that is not actually supported is a boot-time configuration
 * bug, and surfacing it as a network error at runtime hides where it came from.
 */
export function createEvmRuntimeConfig(
  input: EvmRuntimeConfig,
): EvmRuntimeConfig {
  const { networks, defaultChainId } = input

  if (networks.length === 0) {
    throw createEvmWeb3Error(
      "RUNTIME_NOT_CONFIGURED",
      "EVM runtime config must declare at least one network.",
    )
  }

  const seen = new Set<number>()
  for (const network of networks) {
    if (seen.has(network.chain.id)) {
      throw createEvmWeb3Error(
        "NETWORK_NOT_FOUND",
        `Duplicate EVM network for chainId ${network.chain.id}`,
      )
    }
    seen.add(network.chain.id)
  }

  if (!seen.has(defaultChainId)) {
    throw createEvmWeb3Error(
      "NETWORK_NOT_FOUND",
      `Default EVM chainId ${defaultChainId} is not supported in network registry.`,
    )
  }

  return Object.freeze({
    networks: Object.freeze([...networks]),
    defaultChainId,
  })
}

let installedConfig: EvmRuntimeConfig | null = null

/**
 * Install the configuration the registry selectors read from.
 *
 * Selectors are plain functions called from hooks, services and scripts alike,
 * so the installed config is module-scoped rather than React context — a React
 * context would not reach `createEvmPublicClient` or the smoke script.
 * `EvmProvider` calls this during mount; non-React consumers call it themselves.
 */
export function configureEvmRuntime(
  config: EvmRuntimeConfig,
): EvmRuntimeConfig {
  installedConfig = config
  return config
}

export function getEvmRuntimeConfig(): EvmRuntimeConfig {
  if (!installedConfig) {
    throw createEvmWeb3Error(
      "RUNTIME_NOT_CONFIGURED",
      "EVM runtime is not configured. Call configureEvmRuntime(...) — or mount EvmProvider with a runtimeConfig — before reading the network registry.",
    )
  }
  return installedConfig
}

export function isEvmRuntimeConfigured(): boolean {
  return installedConfig !== null
}

/** Test-only teardown so one test file cannot leak its config into the next. */
export function resetEvmRuntime(): void {
  installedConfig = null
}
