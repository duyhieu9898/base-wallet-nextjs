/**
 * Solana address and signature primitives.
 *
 * React-free and adapter-free — see `./index.ts` for why that matters.
 *
 * Two differences from the EVM helpers that are easy to get wrong:
 *
 * 1. **There is no checksum.** EVM uses EIP-55 mixed case to catch typos, so
 *    `toChecksumAddress` has meaning there. Base58 addresses are case-sensitive
 *    throughout: `abc` and `Abc` are different addresses, not different
 *    renderings of one. Nothing here lowercases an address, and comparison is a
 *    plain string comparison after validation.
 *
 * 2. **Validity is not membership on the ed25519 curve.** `new PublicKey(x)`
 *    accepts any 32 bytes, and Program Derived Addresses are deliberately
 *    *off*-curve — a PDA is a valid account address that no keypair can sign
 *    for. `isValidAddress` therefore accepts PDAs, and `isSignableAddress`
 *    exists separately for the "can a wallet own this?" question.
 */

import { PublicKey } from "@solana/web3.js"

/**
 * The System Program, all-ones in base58. Solana has no zero address and no
 * native "token contract": native SOL is a lamport balance on the account
 * itself, not an SPL mint. The EVM habit of using a sentinel token address to
 * mean "native" does not carry over, so there is no `SOLANA_NATIVE_TOKEN_ADDRESS`
 * here — reads ask for the native balance explicitly instead.
 */
export const SYSTEM_PROGRAM_ADDRESS = "11111111111111111111111111111111"

/** Wrapped SOL. An actual SPL mint, unlike native SOL. */
export const WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112"

/**
 * True when the input decodes to a 32-byte base58 public key.
 *
 * Accepts PDAs. See the note at the top of this file — rejecting off-curve keys
 * here would reject every program-owned account the runtime has to read.
 */
export function isValidAddress(value: string): boolean {
  if (value === "") {
    return false
  }

  try {
    // The constructor validates length and base58 alphabet, and throws otherwise.
    new PublicKey(value)
    return true
  } catch {
    return false
  }
}

/**
 * True when the address is a valid public key that lies on the ed25519 curve,
 * i.e. one a keypair can sign for.
 *
 * Use this to reject a PDA where a wallet or a transfer recipient is required.
 * Sending to an off-curve address that is not a real token account is a way to
 * lose funds permanently.
 */
export function isSignableAddress(value: string): boolean {
  if (!isValidAddress(value)) {
    return false
  }

  return PublicKey.isOnCurve(new PublicKey(value))
}

/** Byte-equality of two addresses. Base58 is case-sensitive; do not fold case. */
export function isSameAddress(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  if (!left || !right) {
    return false
  }

  if (!isValidAddress(left) || !isValidAddress(right)) {
    return false
  }

  return new PublicKey(left).equals(new PublicKey(right))
}

/**
 * True when the input is a plausible transaction signature: 64 bytes in base58.
 *
 * Solana calls this a *signature*, not a hash, and it is 64 bytes rather than
 * the 32 an EVM transaction hash carries — so an EVM-shaped length check would
 * reject every valid one.
 */
export function isValidSignature(value: string): boolean {
  if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(value)) {
    return false
  }

  // Base58 has no fixed character count for a byte length; 64 bytes lands in
  // this range. Decoding would be exact but would pull a decoder into a module
  // that otherwise only needs PublicKey.
  return value.length >= 86 && value.length <= 88
}

/** `AbCdEf…UvWxYz` for display. Never use the result for comparison. */
export function shortenAddress(value: string, visible = 4): string {
  if (!isValidAddress(value)) {
    return value
  }

  if (value.length <= visible * 2 + 1) {
    return value
  }

  return `${value.slice(0, visible)}…${value.slice(-visible)}`
}

/** Same treatment for a transaction signature. */
export function shortenSignature(value: string, visible = 6): string {
  if (value.length <= visible * 2 + 1) {
    return value
  }

  return `${value.slice(0, visible)}…${value.slice(-visible)}`
}

/**
 * Stable key for maps and query keys.
 *
 * Returns the canonical base58 form rather than the raw input, so two spellings
 * of the same key — for example one built from bytes and one pasted by a user —
 * produce the same key. Throws on an invalid address instead of returning a key
 * that silently never matches.
 */
export function toAddressKey(value: string): string {
  if (!isValidAddress(value)) {
    throw new TypeError(`Not a valid Solana address: ${value}`)
  }

  return new PublicKey(value).toBase58()
}
