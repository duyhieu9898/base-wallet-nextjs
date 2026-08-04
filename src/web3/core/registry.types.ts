/**
 * Registry types — framework-agnostic.
 * Core web3 types supporting both EVM and Solana.
 */

export type ChainFamily = "evm" | "solana"

export type NetworkKey = number | string

export type EvmNetworkKey = number

export type ExplorerConfig = {
  name: string
  url: string
  addressUrl: (address: string) => string
  transactionUrl: (hash: string) => string
}

export type FaucetConfig = {
  label: string
  url: string
  assetType: "native" | "token"
}

/**
 * Configure common contract/mint for all families.
 *
 * `address` intentionally left as `string` because Solana mint is not hex — each family declares
 * declare your own type with your strict type (see `evm-registry.types.ts`, where
 * `address` is viem's ​​`Address`). Do not use this type directly in code
 * EVM.
 */
export type AssetContractConfig = {
  type: "erc20" | "spl"
  symbol: string
  name: string
  address: string
  expectedDecimals: number
  enabled: boolean
}
