import { getAddress, isAddress, zeroAddress } from "viem"

/** Standard EVM Zero Address */
export const EVM_ZERO_ADDRESS: `0x${string}` = zeroAddress

/** Standard EVM Native Asset placeholder address (Uniswap / 1inch / 0x protocol convention) */
export const EVM_NATIVE_TOKEN_ADDRESS: `0x${string}` =
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"

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
  return isSameAddress(address, EVM_ZERO_ADDRESS)
}

/**
 * Checks if an address represents the native chain asset (either zero address or standard native asset placeholder address).
 */
export function isNativeTokenAddress(
  address: string | null | undefined,
): boolean {
  if (!address || !isAddress(address)) return false
  return (
    isZeroAddress(address) || isSameAddress(address, EVM_NATIVE_TOKEN_ADDRESS)
  )
}

/**
 * Shortens an EVM address for UI display (Uniswap interface canonical naming standard).
 * Example: `0x086d9feCB2F117369fAbDB884eC6851b36595444` -> `0x086d...5444`
 */
export function shortenAddress(
  address: string | null | undefined,
  startChars = 6,
  endChars = 4,
): string {
  if (!address || !isAddress(address)) return ""
  if (address.length <= startChars + endChars) return address
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}

/**
 * Alias for `shortenAddress` for backward compatibility.
 */
export const truncateAddress = shortenAddress

/**
 * Returns the EIP-55 checksummed version of an EVM address.
 * Throws if the address format is invalid.
 */
export function toChecksumAddress(address: string): `0x${string}` {
  return getAddress(address)
}

/**
 * Safely parses and returns the EIP-55 checksummed version of an address,
 * or null if invalid (does not throw).
 */
export function parseChecksumAddress(
  address: string | null | undefined,
): `0x${string}` | null {
  if (!address || !isAddress(address)) return null
  try {
    return getAddress(address)
  } catch {
    return null
  }
}

/**
 * Normalizes an EVM address to lowercase for map key indexing and lookup.
 * Throws if the address format is invalid.
 */
export function toAddressKey(address: string): Lowercase<`0x${string}`> {
  if (!isValidAddress(address)) {
    throw new Error(`Invalid address format: "${address}"`)
  }
  return address.toLowerCase() as Lowercase<`0x${string}`>
}
