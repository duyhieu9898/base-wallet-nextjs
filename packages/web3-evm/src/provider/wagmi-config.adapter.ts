import { type Chain, type Transport, http } from "viem"
import { createConfig, type Config } from "wagmi"
import { injected } from "wagmi/connectors"

import { createEvmWeb3Error } from "../errors/evm-errors"
import { getEvmNetworkRpcUrl } from "../chain/registry/evm-network.registry"
import type { EvmNetworkConfig } from "../chain/registry/evm-registry.types"
import type { EvmRuntimeConfig } from "../chain/registry/evm-runtime-config"

/**
 * React/Wagmi hosting options. Deliberately separate from `EvmRuntimeConfig`:
 * `ssr` says nothing about a chain, and folding it into chain metadata would
 * give the registry a framework identity it should not have.
 */
export type EvmProviderOptions = {
  ssr: boolean
}

export function toNonEmptyChainTuple(
  chains: readonly Chain[],
): readonly [Chain, ...Chain[]] {
  const [first, ...rest] = chains
  if (!first) {
    throw createEvmWeb3Error(
      "NETWORK_NOT_FOUND",
      "Cannot build Wagmi config: no EVM chains defined.",
    )
  }
  return [first, ...rest]
}

export function createEvmConnectors() {
  return [injected()]
}

function buildTransports(
  networks: readonly EvmNetworkConfig[],
): Record<number, Transport> {
  return networks.reduce<Record<number, Transport>>((transports, network) => {
    transports[network.chain.id] = http(getEvmNetworkRpcUrl(network))
    return transports
  }, {})
}

/**
 * Built from the config the consumer passed in, not from a module-scoped
 * registry: importing this module must not construct a Wagmi client, and the
 * application — not the package — decides whether the host renders on a server.
 */
export function createWagmiConfig(
  runtimeConfig: EvmRuntimeConfig,
  options: EvmProviderOptions,
): Config {
  const { networks } = runtimeConfig
  const chains = toNonEmptyChainTuple(networks.map((network) => network.chain))

  return createConfig({
    chains,
    connectors: createEvmConnectors(),
    transports: buildTransports(networks),
    ssr: options.ssr,
  })
}
