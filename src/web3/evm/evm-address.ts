import type { Address } from "viem"

import { isValidAddress } from "@/web3/core/address.utils"
import { createEvmWeb3Error } from "@/web3/evm/errors"

/**
 * Normalize EVM address to lowercase for use as map key and comparison.
 *
 * The function is at the EVM layer (not the core) so it can throw `EvmWeb3Error` with `code`
 * without creating a reverse import core → evm.
 */
export function toAddressKey(address: Address): Lowercase<Address> {
  if (!isValidAddress(address)) {
    throw createEvmWeb3Error(
      "INVALID_ADDRESS",
      `Invalid address format: "${address}"`,
    )
  }
  return address.toLowerCase() as Lowercase<Address>
}
