import type { Address } from "viem"

import { isValidAddress, toChecksumAddress } from "@/web3/evm/address"
import { createAuthError } from "./auth-error"

/**
 * Pure builder cho SIWE message theo EIP-4361.
 *
 * Repository does not add dependency `siwe`: builder needs deterministic, testable
 * and does not entail signature verification on the client side — verification is the job
 * of the backend, the frontend check cannot be replaced.
 *
 * Builder intentionally only serves EVM. Do not create the abstraction "chain-family-neutral
 * message" when there is only one real consumer.
 */

export type BuildSiweMessageInput = {
  domain: string
  address: Address
  uri: string
  chainId: number
  nonce: string
  issuedAt: string
  expirationTime?: string
  statement?: string
}

const SIWE_VERSION = "1"

/**
 * Timestamp in SIWE message must be ISO-8601. The backend can send other formats
 * (e.g. no milliseconds); normalize so that messages always have a unique form.
 */
function toIsoTimestamp(value: string, field: string): string {
  const parsed = Date.parse(value)

  if (!Number.isFinite(parsed)) {
    throw createAuthError(
      "INVALID_AUTH_RESPONSE",
      `Invalid "${field}" timestamp in the sign-in data.`,
    )
  }

  return new Date(parsed).toISOString()
}

/**
 * Statement is a single line according to EIP-4361 grammar — newline in
 * statement will deconstruct the message and can be used to insert fake fields.
 */
function assertSingleLineStatement(statement: string): void {
  if (/[\r\n]/.test(statement)) {
    throw createAuthError(
      "AUTH_UNAVAILABLE",
      "SIWE statement must not contain line breaks.",
    )
  }
}

export function buildSiweMessage({
  domain,
  address,
  uri,
  chainId,
  nonce,
  issuedAt,
  expirationTime,
  statement,
}: BuildSiweMessageInput): string {
  if (domain.trim() === "") {
    throw createAuthError("AUTH_UNAVAILABLE", "Invalid SIWE domain.")
  }

  if (nonce.trim() === "") {
    throw createAuthError("INVALID_AUTH_RESPONSE", "Invalid sign-in nonce.")
  }

  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw createAuthError("AUTH_UNAVAILABLE", "Invalid chain ID.")
  }

  // EIP-4361 requires an address of the EIP-55 checksummed format. Check before
  // checksum so that the error emitted is `AuthError` and not viem's ​​raw error —
  // This message can go straight to the UI.
  if (!isValidAddress(address)) {
    throw createAuthError("INVALID_AUTH_RESPONSE", "Invalid wallet address.")
  }

  const checksummedAddress = toChecksumAddress(address)

  const lines: string[] = [
    `${domain} wants you to sign in with your Ethereum account:`,
    checksummedAddress,
    "",
  ]

  if (statement !== undefined && statement.trim() !== "") {
    assertSingleLineStatement(statement)
    lines.push(statement.trim(), "")
  }

  lines.push(
    `URI: ${uri}`,
    `Version: ${SIWE_VERSION}`,
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${toIsoTimestamp(issuedAt, "issuedAt")}`,
  )

  if (expirationTime !== undefined) {
    lines.push(
      `Expiration Time: ${toIsoTimestamp(expirationTime, "expirationTime")}`,
    )
  }

  return lines.join("\n")
}
