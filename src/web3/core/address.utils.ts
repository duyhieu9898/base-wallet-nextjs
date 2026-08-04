import { getAddress, isAddress, zeroAddress } from "viem"

/**
 * Checks if a value is a valid EVM hex address. Safe type-guard function (returns boolean, does not throw).
 */
export function isValidAddress(
  address: string | null | undefined,
): address is `0x${string}` {
  if (!address) return false
  return isAddress(address)
}

/**
 * Checks whether two EVM addresses are equal (case-insensitive).
 * Handles checksummed vs lowercase address comparisons safely.
 */
export function isSameAddress(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) return false
  if (!isAddress(a) || !isAddress(b)) return false
  return a.toLowerCase() === b.toLowerCase()
}

/**
 * Checks if an address is the EVM zero address (`0x0000...0000`).
 */
export function isZeroAddress(address: string | null | undefined): boolean {
  if (!address || !isAddress(address)) return false
  return isSameAddress(address, zeroAddress)
}

/**
 * Truncates an EVM address for UI display.
 * Example: `0x086d9feCB2F117369fAbDB884eC6851b36595444` -> `0x086d...5444`
 */
export function truncateAddress(
  address: string | null | undefined,
  startChars = 6,
  endChars = 4,
): string {
  if (!address || !isAddress(address)) return ""
  if (address.length <= startChars + endChars) return address
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}

/**
 * Returns the EIP-55 checksummed version of an EVM address.
 * Throws if the address format is invalid.
 */
export function toChecksumAddress(address: string): `0x${string}` {
  return getAddress(address)
}
