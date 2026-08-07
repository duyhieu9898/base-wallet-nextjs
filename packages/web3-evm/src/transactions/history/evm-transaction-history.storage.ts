import { isAddress, isHex, type Address, type Hash } from "viem"

import type {
  EvmTransactionHistoryItem,
  EvmTransactionHistoryStatus,
} from "./evm-transaction-history"

// v3 splits history in two: this store keeps the mechanical record and its
// discriminator is `kind`, with feature meaning moved to a feature-owned store.
// Per 0012 an item-schema change bumps the key, so v2 entries are abandoned
// rather than read by a validator that never saw them. That is a deliberate loss
// of existing local history, acceptable only because no application is in
// production yet.
export const EVM_TRANSACTION_HISTORY_STORAGE_KEY =
  "base-wallet:evm-transactions:v3"
export const MAX_HISTORY_ITEMS = 50
export const EVM_TRANSACTION_HISTORY_CHANGE_EVENT =
  "base-wallet:evm-history-change"

const VALID_STATUSES = new Set<EvmTransactionHistoryStatus>([
  "pending",
  "success",
  "reverted",
  "unknown",
])

export function notifyHistoryChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVM_TRANSACTION_HISTORY_CHANGE_EVENT))
  }
}

export function isValidHistoryItem(
  raw: unknown,
): raw is EvmTransactionHistoryItem {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return false
  }

  const candidate = raw as Record<string, unknown>

  if (
    typeof candidate.hash !== "string" ||
    !isHex(candidate.hash) ||
    candidate.hash.length !== 66
  ) {
    return false
  }

  if (
    typeof candidate.chainId !== "number" ||
    !Number.isInteger(candidate.chainId) ||
    candidate.chainId <= 0
  ) {
    return false
  }

  if (typeof candidate.account !== "string" || !isAddress(candidate.account)) {
    return false
  }

  if (
    typeof candidate.status !== "string" ||
    !VALID_STATUSES.has(candidate.status as EvmTransactionHistoryStatus)
  ) {
    return false
  }

  if (
    typeof candidate.submittedAt !== "number" ||
    !Number.isFinite(candidate.submittedAt) ||
    candidate.submittedAt <= 0
  ) {
    return false
  }

  if (
    typeof candidate.updatedAt !== "number" ||
    !Number.isFinite(candidate.updatedAt) ||
    candidate.updatedAt <= 0
  ) {
    return false
  }

  const kind = candidate.kind
  if (typeof kind !== "string") {
    return false
  }

  if (kind === "native-transfer") {
    if (typeof candidate.assetSymbol !== "string") return false
    if (typeof candidate.amount !== "string") return false
    if (
      typeof candidate.recipient !== "string" ||
      !isAddress(candidate.recipient)
    ) {
      return false
    }
    // Reject cross-kind fields
    if ("tokenAddress" in candidate || "spender" in candidate) return false
    return true
  }

  if (kind === "token-transfer") {
    if (
      typeof candidate.tokenAddress !== "string" ||
      !isAddress(candidate.tokenAddress)
    ) {
      return false
    }
    if (typeof candidate.assetSymbol !== "string") return false
    if (typeof candidate.amount !== "string") return false
    if (
      typeof candidate.recipient !== "string" ||
      !isAddress(candidate.recipient)
    ) {
      return false
    }
    // Reject cross-kind fields
    if ("spender" in candidate) return false
    return true
  }

  if (kind === "token-approval") {
    if (
      typeof candidate.tokenAddress !== "string" ||
      !isAddress(candidate.tokenAddress)
    ) {
      return false
    }
    if (typeof candidate.assetSymbol !== "string") return false
    if (typeof candidate.amount !== "string") return false
    if (
      typeof candidate.spender !== "string" ||
      !isAddress(candidate.spender)
    ) {
      return false
    }
    // Reject cross-kind fields
    if ("recipient" in candidate) return false
    return true
  }

  if (kind === "contract-write") {
    if (
      typeof candidate.contractAddress !== "string" ||
      !isAddress(candidate.contractAddress)
    ) {
      return false
    }
    if (typeof candidate.assetSymbol !== "string") return false
    if (typeof candidate.amount !== "string") return false
    // Optional: only a write that moves an ERC-20 carries one.
    if (
      candidate.tokenAddress !== undefined &&
      (typeof candidate.tokenAddress !== "string" ||
        !isAddress(candidate.tokenAddress))
    ) {
      return false
    }
    // Business fields do not belong in the mechanical record; a feature stores
    // them in its own record, joined by hash.
    if (
      "recipient" in candidate ||
      "spender" in candidate ||
      "operation" in candidate ||
      "action" in candidate
    ) {
      return false
    }
    return true
  }

  return false
}

function getItemKey(chainId: number, hash: string): string {
  return `${chainId}:${hash.toLowerCase()}`
}

export function normalizeEvmTransactionHistory(
  raw: unknown,
): EvmTransactionHistoryItem[] {
  if (!Array.isArray(raw)) return []

  const validItems: EvmTransactionHistoryItem[] = []
  const seenKeys = new Set<string>()

  for (const item of raw) {
    if (isValidHistoryItem(item)) {
      const key = getItemKey(item.chainId, item.hash)
      if (!seenKeys.has(key)) {
        seenKeys.add(key)
        validItems.push(item)
      }
    }
  }

  validItems.sort((a, b) => b.submittedAt - a.submittedAt)
  return validItems.slice(0, MAX_HISTORY_ITEMS)
}

export function loadEvmTransactionHistory(): EvmTransactionHistoryItem[] {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return []
    }

    const storage = window.localStorage
    const rawData = storage.getItem(EVM_TRANSACTION_HISTORY_STORAGE_KEY)
    if (!rawData) return []

    const parsed: unknown = JSON.parse(rawData)
    return normalizeEvmTransactionHistory(parsed)
  } catch {
    return []
  }
}

export function saveEvmTransactionHistory(
  items: readonly EvmTransactionHistoryItem[],
): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return
    }

    const normalized = normalizeEvmTransactionHistory(items)
    const storage = window.localStorage
    storage.setItem(
      EVM_TRANSACTION_HISTORY_STORAGE_KEY,
      JSON.stringify(normalized),
    )
    notifyHistoryChanged()
  } catch {
    // Controlled storage error handling — never throw
  }
}

export function addEvmTransactionHistoryItem(
  item: EvmTransactionHistoryItem,
): EvmTransactionHistoryItem[] {
  if (!isValidHistoryItem(item)) {
    return loadEvmTransactionHistory()
  }

  const current = loadEvmTransactionHistory()
  const keyToFind = getItemKey(item.chainId, item.hash)

  const filtered = current.filter(
    (existing) => getItemKey(existing.chainId, existing.hash) !== keyToFind,
  )

  const updatedList = [item, ...filtered]
  saveEvmTransactionHistory(updatedList)
  return loadEvmTransactionHistory()
}

export function updateEvmTransactionHistoryItem(
  hash: Hash,
  chainId: number,
  patch: Partial<EvmTransactionHistoryItem>,
): EvmTransactionHistoryItem[] {
  const current = loadEvmTransactionHistory()
  const keyToFind = getItemKey(chainId, hash)
  let found = false

  const updatedList = current.map((existing) => {
    if (getItemKey(existing.chainId, existing.hash) === keyToFind) {
      found = true
      const candidate = {
        ...existing,
        ...patch,
        hash: existing.hash, // preserve canonical identity
        chainId: existing.chainId,
        updatedAt: Date.now(),
      }
      return isValidHistoryItem(candidate) ? candidate : existing
    }
    return existing
  })

  if (!found) {
    return current
  }

  saveEvmTransactionHistory(updatedList)
  return loadEvmTransactionHistory()
}

export function clearEvmTransactionHistory(filter?: {
  account?: Address
  chainId?: number
}): EvmTransactionHistoryItem[] {
  if (!filter || (!filter.account && !filter.chainId)) {
    saveEvmTransactionHistory([])
    return []
  }

  const current = loadEvmTransactionHistory()
  const remaining = current.filter((item) => {
    const accountMatches =
      !filter.account ||
      item.account.toLowerCase() === filter.account.toLowerCase()

    const chainMatches =
      filter.chainId === undefined || item.chainId === filter.chainId

    const shouldDelete = accountMatches && chainMatches
    return !shouldDelete
  })

  saveEvmTransactionHistory(remaining)
  return loadEvmTransactionHistory()
}
