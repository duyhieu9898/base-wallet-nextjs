/**
 * Staking activity — the business half of transaction history (decision 0012).
 *
 * The foundation records that a `contract-write` moved 10 USDC into a contract.
 * This store records that the write was a stake rather than an unstake. Splitting
 * them is what lets membership and lending add their own vocabulary later without
 * three features colliding in one closed union inside the foundation.
 *
 * Everything here is a side effect. Failing to write an activity record must never
 * change a transaction's outcome, and a missing record must never hide the
 * transaction: the mechanical record alone still displays as a generic contract
 * write. Both properties are covered by tests.
 */

import type { Hash } from "viem"

import type { FeatureActivityRecord } from "@nln/web3-evm"

export const STAKING_ACTIVITY_STORAGE_KEY = "staking:activity:v1"
export const MAX_STAKING_ACTIVITY_ITEMS = 50
export const STAKING_ACTIVITY_CHANGE_EVENT = "staking:activity-change"

export type StakingActivityAction = "stake" | "unstake"

export type StakingActivityRecord = FeatureActivityRecord & {
  feature: "staking"
  action: StakingActivityAction
}

function isValidActivityRecord(raw: unknown): raw is StakingActivityRecord {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return false
  }
  const candidate = raw as Record<string, unknown>

  if (typeof candidate.id !== "string" || candidate.id === "") return false
  if (
    typeof candidate.transactionHash !== "string" ||
    !candidate.transactionHash.startsWith("0x") ||
    candidate.transactionHash.length !== 66
  ) {
    return false
  }
  if (candidate.feature !== "staking") return false
  if (candidate.action !== "stake" && candidate.action !== "unstake") {
    return false
  }
  if (
    typeof candidate.createdAt !== "number" ||
    !Number.isFinite(candidate.createdAt) ||
    candidate.createdAt <= 0
  ) {
    return false
  }
  return true
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function notifyStakingActivityChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(STAKING_ACTIVITY_CHANGE_EVENT))
  }
}

/**
 * Deduped by `id`, keeping the first record written for it. Re-recording the same
 * operation is a no-op rather than a second entry, so composing this store with
 * the mechanical one cannot produce a duplicate row.
 */
function normalize(raw: unknown): StakingActivityRecord[] {
  if (!Array.isArray(raw)) return []

  const seen = new Set<string>()
  const valid: StakingActivityRecord[] = []
  for (const item of raw) {
    if (!isValidActivityRecord(item)) continue
    if (seen.has(item.id)) continue
    seen.add(item.id)
    valid.push(item)
  }
  return valid.slice(0, MAX_STAKING_ACTIVITY_ITEMS)
}

export function loadStakingActivity(): StakingActivityRecord[] {
  const storage = getStorage()
  if (!storage) return []
  try {
    const raw = storage.getItem(STAKING_ACTIVITY_STORAGE_KEY)
    if (!raw) return []
    return normalize(JSON.parse(raw))
  } catch {
    return []
  }
}

export function saveStakingActivity(
  records: readonly StakingActivityRecord[],
): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(
      STAKING_ACTIVITY_STORAGE_KEY,
      JSON.stringify(normalize(records)),
    )
    notifyStakingActivityChanged()
  } catch {
    // Storage is a side effect; a quota or privacy-mode failure is not a
    // transaction failure.
  }
}

/**
 * Idempotent by `id`: recording the same operation twice keeps the first record.
 */
export function recordStakingActivity(
  record: StakingActivityRecord,
): StakingActivityRecord[] {
  if (!isValidActivityRecord(record)) return loadStakingActivity()

  const current = loadStakingActivity()
  if (current.some((existing) => existing.id === record.id)) {
    return current
  }

  const updated = [record, ...current].slice(0, MAX_STAKING_ACTIVITY_ITEMS)
  saveStakingActivity(updated)
  return loadStakingActivity()
}

/**
 * Lookup used when composing the two stores for display. A hash with no activity
 * returns null, and the caller renders the mechanical record on its own.
 */
export function findStakingActivityByHash(
  hash: Hash,
  records: readonly StakingActivityRecord[] = loadStakingActivity(),
): StakingActivityRecord | null {
  const target = hash.toLowerCase()
  return (
    records.find((record) => record.transactionHash.toLowerCase() === target) ??
    null
  )
}

/**
 * Label for a transaction row, or null when this feature did not initiate it.
 *
 * Returning null is the normal case for a hash owned by another feature or by a
 * plain transfer — the caller then renders the mechanical record unchanged.
 */
export function describeStakingActivity(hash: Hash): string | null {
  const activity = findStakingActivityByHash(hash)
  return activity ? `${activity.feature} · ${activity.action}` : null
}
