import type { EvmNetworkConfig } from "../registry/evm-network.registry"

export type EvmSelectionStatus =
  "disconnected" | "connecting" | "ready" | "unsupported"

export type EvmSelection =
  | {
      status: "disconnected"
      account: null
      walletChainId: null
      chainId: number
      network: EvmNetworkConfig
      networks: readonly EvmNetworkConfig[]
    }
  | {
      status: "connecting"
      account: `0x${string}` | null
      walletChainId: null
      chainId: null
      network: null
      networks: readonly EvmNetworkConfig[]
    }
  | {
      status: "ready"
      account: `0x${string}`
      walletChainId: number
      chainId: number
      network: EvmNetworkConfig
      networks: readonly EvmNetworkConfig[]
    }
  | {
      status: "unsupported"
      account: `0x${string}` | null
      walletChainId: number
      chainId: null
      network: null
      networks: readonly EvmNetworkConfig[]
    }

export function resolveEvmSelection(input: {
  connected: boolean
  address?: `0x${string}`
  chainId?: number
  defaultNetwork: EvmNetworkConfig
  availableNetworks: readonly EvmNetworkConfig[]
}): EvmSelection {
  const { connected, address, chainId, defaultNetwork, availableNetworks } =
    input

  if (!connected || !address) {
    return {
      status: "disconnected",
      account: null,
      walletChainId: null,
      chainId: defaultNetwork.chain.id,
      network: defaultNetwork,
      networks: availableNetworks,
    }
  }

  // Connected but chainId not yet resolved from wallet
  if (chainId === undefined || chainId === null) {
    return {
      status: "connecting",
      account: address,
      walletChainId: null,
      chainId: null,
      network: null,
      networks: availableNetworks,
    }
  }

  const matchingNetwork = availableNetworks.find(
    (net) => net.chain.id === chainId,
  )

  if (!matchingNetwork) {
    return {
      status: "unsupported",
      account: address,
      walletChainId: chainId,
      chainId: null,
      network: null,
      networks: availableNetworks,
    }
  }

  return {
    status: "ready",
    account: address,
    walletChainId: chainId,
    chainId: matchingNetwork.chain.id,
    network: matchingNetwork,
    networks: availableNetworks,
  }
}
