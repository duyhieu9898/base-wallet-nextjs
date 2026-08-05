import type { Address, Hash } from "viem"

import type { EvmNetworkKey } from "@/web3/evm/chain/registry/registry.types"

/**
 * Domain types of EVM family module.
 *
 * They represent the actual running EVM data (address hex, tx hash 32 bytes).
 * Use viem's ​​strict type and literal `family: "evm"`. Another family declares
 * your own type instead of converting these types to `string` — expand the type here
 * Loss type safety of all EVM lines using them, and a shared type
 * for multiple families to be created only when there are two real runtime consumers.
 */
export type EvmWalletConnection = {
  family: "evm"
  address: Address | null
  connected: boolean
  connecting: boolean
}

export type EvmAssetBalance = {
  family: "evm"
  networkKey: EvmNetworkKey
  assetId: string
  assetType: "native" | "erc20"
  /** Contract address (only meaningful for assetType "erc20"). */
  address?: Address
  rawAmount: bigint
  formattedAmount: string
  decimals: number
  symbol: string
}

export type EvmTransactionReference = {
  family: "evm"
  networkKey: EvmNetworkKey
  hash: Hash
}
