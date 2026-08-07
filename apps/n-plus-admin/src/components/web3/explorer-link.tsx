"use client"

import { ExternalLink } from "lucide-react"

import {
  isValidAddress,
  isValidTransactionHash,
  shortenAddress,
  shortenHash,
} from "@nln/web3-evm/address"
import {
  getAddressExplorerUrl,
  getTransactionExplorerUrl,
} from "@nln/web3-evm/registry"

import { cn } from "@/lib/utils"

import { useExplorerChainId } from "./explorer-chain-context"

/**
 * Canonical presentation for on-chain identifiers in admin tables.
 *
 * Every table that shows a wallet address or a transaction hash renders it the
 * same way: shortened with the foundation's own helper, monospaced, and linked to
 * the block explorer in a new tab. Shortening and URL construction both come from
 * `@nln/web3-evm` — an admin table is not the place to re-derive `slice(0, 6)` or
 * hardcode an explorer domain.
 *
 * The chain comes from `ExplorerChainProvider`, not from a config module: these
 * cells must stay reusable by a second admin console that points somewhere else.
 * No provider means no link — see the context for why that is the safe default.
 *
 * Degradation is deliberate: an identifier that fails validation renders as plain
 * text. A wrong explorer link on an audit screen is worse than no link.
 */

type ExplorerLinkProps = {
  /** Full explorer URL. */
  href: string
  /** Shortened text shown in the cell. */
  label: string
  /** Full identifier, surfaced on hover and to assistive technology. */
  title: string
  className?: string
}

function ExplorerLink({ href, label, title, className }: ExplorerLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      title={title}
      className={cn(
        "text-foreground hover:text-primary inline-flex items-center gap-1 font-mono underline-offset-2 hover:underline",
        className,
      )}
    >
      {label}
      <ExternalLink className="size-3 shrink-0 opacity-60" aria-hidden="true" />
    </a>
  )
}

function PlainIdentifier({
  value,
  className,
}: {
  value: string
  className?: string
}) {
  return (
    <span className={cn("text-muted-foreground font-mono", className)}>
      {value || "—"}
    </span>
  )
}

export type WalletAddressCellProps = {
  address: string | null | undefined
  /** Leading characters kept when shortening. */
  startChars?: number
  /** Trailing characters kept when shortening. */
  endChars?: number
  className?: string
}

/**
 * Wallet address cell — shortened, linked to `/address/{address}`.
 */
export function WalletAddressCell({
  address,
  startChars,
  endChars,
  className,
}: WalletAddressCellProps) {
  const chainId = useExplorerChainId()

  if (!isValidAddress(address) || chainId === null) {
    return <PlainIdentifier value={address ?? ""} className={className} />
  }

  return (
    <ExplorerLink
      href={getAddressExplorerUrl(chainId, address)}
      label={shortenAddress(address, startChars, endChars)}
      title={address}
      className={className}
    />
  )
}

export type TransactionHashCellProps = {
  hash: string | null | undefined
  /** Leading characters kept when shortening. */
  startChars?: number
  /** Trailing characters kept when shortening. */
  endChars?: number
  className?: string
}

/**
 * Transaction hash cell — shortened, linked to `/tx/{hash}`.
 */
export function TransactionHashCell({
  hash,
  startChars,
  endChars,
  className,
}: TransactionHashCellProps) {
  const chainId = useExplorerChainId()

  if (!isValidTransactionHash(hash) || chainId === null) {
    return <PlainIdentifier value={hash ?? ""} className={className} />
  }

  return (
    <ExplorerLink
      href={getTransactionExplorerUrl(chainId, hash)}
      label={shortenHash(hash, startChars, endChars)}
      title={hash}
      className={className}
    />
  )
}
