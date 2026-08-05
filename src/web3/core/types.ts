/**
 * Asset id is the convention for native assets of a network.
 *
 * Wallet connection, asset balance, and transaction references remain owned by
 * each implemented family because they depend on its account model.
 */
export const NATIVE_ASSET_ID = "native" as const
