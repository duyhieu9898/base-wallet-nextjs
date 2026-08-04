import { createPublicClient, http, type PublicClient } from "viem"

import {
  getEvmNetworkByChainId,
  getEvmNetworkRpcUrl,
} from "@/web3/evm/adapters/evm-registry.adapter"

const clientCache = new Map<number, PublicClient>()

export function createEvmPublicClient(chainId: number): PublicClient {
  const cached = clientCache.get(chainId)
  if (cached) {
    return cached
  }

  const network = getEvmNetworkByChainId(chainId)

  const client = createPublicClient({
    chain: network.chain,
    transport: http(getEvmNetworkRpcUrl(network)),
    batch: { multicall: true },
  })

  clientCache.set(chainId, client as PublicClient)
  return client as PublicClient
}
