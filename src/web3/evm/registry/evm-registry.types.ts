import type { Address, Chain } from "viem"
import type { FaucetConfig } from "@/web3/core/registry.types"

export type AssetContractConfig = {
  type: "erc20"
  symbol: string
  name: string
  address: Address
  expectedDecimals: number
  enabled: boolean
}

export type EvmNetworkConfig = Readonly<{
  key: string
  family: "evm"
  chain: Chain
  rpcUrlOverride?: string
  tokens: Readonly<Record<string, AssetContractConfig>>
  faucets: readonly FaucetConfig[]
}>
