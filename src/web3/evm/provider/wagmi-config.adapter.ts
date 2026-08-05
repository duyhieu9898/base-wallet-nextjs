import { type Chain, type Transport, http } from "viem"
import { createConfig, type Config } from "wagmi"
import { injected } from "wagmi/connectors"

import { createEvmWeb3Error } from "@/web3/evm/errors/evm-errors"
import {
  getAllEvmNetworks,
  getEvmNetworkRpcUrl,
  type EvmNetworkConfig,
} from "@/web3/evm/chain/registry/evm-network.registry"

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

export function createWagmiConfigFromRegistry(): Config {
  const networks = getAllEvmNetworks()
  const chains = toNonEmptyChainTuple(networks.map((network) => network.chain))
  const transports = buildTransports(networks)

  return createConfig({
    chains,
    connectors: createEvmConnectors(),
    transports,
    ssr: true,
  })
}

export const wagmiConfig = createWagmiConfigFromRegistry()
