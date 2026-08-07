/**
 * Minimal parser for SIWE messages — serves mock backend only.
 *
 * Located in `src/mocks/` not `domain/` because the only consumer is MSW
 * handler: the real frontend only **creates** the message, the real backend is the one that reads and
 * verify. Leaving it in the domain would falsely suggest that the application needs parsing.
 *
 * This is NOT verification: it does not recover the signer and does not check the signature.
 */
export type ParsedSiweMessage = {
  domain: string
  address: string
  uri: string
  version: string
  chainId: number
  nonce: string
  issuedAt: string
  expirationTime: string | null
}

export function parseSiweMessage(message: string): ParsedSiweMessage | null {
  const lines = message.split("\n")

  const domain = lines[0]?.match(
    /^(.+) wants you to sign in with your Ethereum account:$/,
  )?.[1]
  const address = lines[1]

  if (domain === undefined || address === undefined) {
    return null
  }

  const field = (name: string): string | null => {
    const prefix = `${name}: `
    const line = lines.find((candidate) => candidate.startsWith(prefix))

    return line === undefined ? null : line.slice(prefix.length)
  }

  const uri = field("URI")
  const version = field("Version")
  const rawChainId = field("Chain ID")
  const nonce = field("Nonce")
  const issuedAt = field("Issued At")

  if (
    uri === null ||
    version === null ||
    rawChainId === null ||
    nonce === null ||
    issuedAt === null
  ) {
    return null
  }

  const chainId = Number(rawChainId)

  if (!Number.isInteger(chainId) || chainId <= 0) {
    return null
  }

  return {
    domain,
    address,
    uri,
    version,
    chainId,
    nonce,
    issuedAt,
    expirationTime: field("Expiration Time"),
  }
}
