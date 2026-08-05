/**
 * Registry types — framework-agnostic.
 * Core web3 types supporting implemented runtimes only.
 */

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
