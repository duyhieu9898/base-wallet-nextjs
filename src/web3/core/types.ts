export type { ChainFamily } from "./registry.types"

/**
 * Asset id is the convention for native assets of a network.
 *
 * This is one of the few concepts that is truly consistent across chain families
 * kept at the core. Wallet connection, asset balance and transaction reference
 * not: they depend on the address/hash/account model of each family and
 * belongs to the corresponding module family (see `web3/evm/types/evm-domain.ts`).
 */
export const NATIVE_ASSET_ID = "native" as const
