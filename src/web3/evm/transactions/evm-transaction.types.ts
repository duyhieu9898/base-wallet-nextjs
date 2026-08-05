import type { Hash } from "viem"

import type { EvmNetworkKey } from "@/web3/evm/chain/registry/registry.types"

/**
 * Domain types of EVM family module.
 *
 * They represent the actual running EVM data (address hex, tx hash 32 bytes).
 * Use viem's strict type and literal `family: "evm"`. Another family declares
 * its own type instead of widening these to `string`: a shared cross-family type
 * is created only when two real runtime consumers prove it.
 */
export type EvmTransactionReference = {
  family: "evm"
  networkKey: EvmNetworkKey
  hash: Hash
}
