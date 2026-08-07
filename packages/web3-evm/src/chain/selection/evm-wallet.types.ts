import type { Address } from "viem"

/**
 * Domain types of EVM family module.
 *
 * They represent the actual running EVM data (address hex, tx hash 32 bytes).
 * Use viem's strict type and literal `family: "evm"`. Another family declares
 * its own type instead of widening these to `string`: a shared cross-family type
 * is created only when two real runtime consumers prove it.
 */
export type EvmWalletConnection = {
  family: "evm"
  address: Address | null
  connected: boolean
  connecting: boolean
}
