/**
 * Registry types — framework-agnostic, adapter-free.
 *
 * The unit of selection on Solana is a **cluster**, not a numeric chain id.
 * There is no `chainId` anywhere in this package: Solana identifies a cluster by
 * its genesis hash and, in practice, by which RPC endpoint you are talking to.
 * That is why `SolanaClusterKey` is a string union rather than a number, and why
 * verifying you are on the intended cluster is an RPC call (`getGenesisHash`)
 * rather than reading a field off the wallet.
 */

export type SolanaClusterKey =
  "mainnet-beta" | "devnet" | "testnet" | "localnet"

export type ExplorerConfig = {
  name: string
  url: string
  addressUrl: (address: string) => string
  transactionUrl: (signature: string) => string
}

export type FaucetConfig = {
  label: string
  url: string
  assetType: "native" | "token"
}

/**
 * An SPL token the application supports on a given cluster.
 *
 * `mint` replaces the EVM `address`: an SPL token is identified by its mint
 * account, and a holder's balance lives in a separate token account derived from
 * (owner, mint) rather than in a mapping inside the token itself.
 *
 * `expectedDecimals` is declared so a read can be rejected when the on-chain
 * mint disagrees, same intent as the EVM registry — a token whose decimals are
 * assumed rather than verified misprices every amount by a power of ten.
 */
export type SplTokenConfig = {
  mint: string
  name: string
  symbol: string
  expectedDecimals: number
  enabled: boolean
}

export type SolanaClusterConfig = {
  key: SolanaClusterKey
  family: "solana"
  /** Display name, e.g. "Solana Devnet". */
  name: string
  /**
   * Required, unlike the EVM registry's optional `rpcUrlOverride`.
   *
   * Viem ships a default transport per chain; `@solana/web3.js` does not, and
   * the public endpoints are rate-limited hard enough that relying on one is a
   * production incident waiting to happen. The consumer must name an endpoint.
   */
  rpcUrl: string
  explorer: ExplorerConfig
  /** Keyed by mint address. */
  tokens: Readonly<Record<string, SplTokenConfig>>
  faucets: readonly FaucetConfig[]
}
