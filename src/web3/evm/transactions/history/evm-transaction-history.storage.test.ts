import type { Address, Hash } from "viem"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  addEvmTransactionHistoryItem,
  clearEvmTransactionHistory,
  EVM_TRANSACTION_HISTORY_STORAGE_KEY,
  loadEvmTransactionHistory,
  saveEvmTransactionHistory,
  updateEvmTransactionHistoryItem,
} from "@/web3/evm/transactions/history/evm-transaction-history.storage"
import type {
  EvmTransactionHistoryItem,
  EvmTransactionHistoryStatus,
} from "@/web3/evm/transactions/history/evm-transaction-history"

const ACCOUNT: Address = "0x086d9feCB2F117369fAbDB884eC6851b36595444"
const OTHER_ACCOUNT: Address = "0x1111111111111111111111111111111111111111"
const RECIPIENT: Address = "0x2222222222222222222222222222222222222222"
const USDC_SEPOLIA: Address = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"

const HASH_1: Hash =
  "0xaaaa1111222233334444555566667777888899990000aaaabbbbccccddddeeee"
const HASH_2: Hash =
  "0xbbbb1111222233334444555566667777888899990000aaaabbbbccccddddeeee"
const HASH_3: Hash =
  "0xcccc1111222233334444555566667777888899990000aaaabbbbccccddddeeee"

const sampleItem1: EvmTransactionHistoryItem = {
  hash: HASH_1,
  chainId: 11155111,
  account: ACCOUNT,
  action: "native-transfer",
  submittedAt: 1000,
  updatedAt: 1000,
  status: "pending",
  assetSymbol: "ETH",
  amount: "0.01",
  recipient: RECIPIENT,
}

const sampleItem2: EvmTransactionHistoryItem = {
  hash: HASH_2,
  chainId: 11155111,
  account: ACCOUNT,
  action: "token-transfer",
  tokenAddress: USDC_SEPOLIA,
  submittedAt: 2000,
  updatedAt: 2000,
  status: "success",
  assetSymbol: "USDC",
  amount: "10.0",
  recipient: RECIPIENT,
}

describe("evm-transaction-history.storage", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      window.localStorage.clear()
    }
  })

  it("load empty storage returns empty array", () => {
    expect(loadEvmTransactionHistory()).toEqual([])
  })

  it("save and load round trip correctly", () => {
    saveEvmTransactionHistory([sampleItem1, sampleItem2])
    const loaded = loadEvmTransactionHistory()
    expect(loaded).toHaveLength(2)
    // Sort newest first (submittedAt: 2000 then 1000)
    expect(loaded[0]?.hash).toBe(HASH_2)
    expect(loaded[1]?.hash).toBe(HASH_1)
  })

  it("Ignore corrupted or non-array JSON without crashing", () => {
    window.localStorage.setItem(
      EVM_TRANSACTION_HISTORY_STORAGE_KEY,
      "{ malformed json ...",
    )
    expect(loadEvmTransactionHistory()).toEqual([])

    window.localStorage.setItem(
      EVM_TRANSACTION_HISTORY_STORAGE_KEY,
      JSON.stringify({ notAnArray: true }),
    )
    expect(loadEvmTransactionHistory()).toEqual([])
  })

  it("Reject items with invalid schema (such as missing hash or invalid account)", () => {
    const invalidItems = [
      { ...sampleItem1, hash: "0xinvalid" },
      { ...sampleItem1, account: "not-an-address" },
      { ...sampleItem1, status: "unknown-status" },
      { ...sampleItem1, chainId: -1 },
      { ...sampleItem2, tokenAddress: undefined }, // missing tokenAddress for token-transfer
    ]
    window.localStorage.setItem(
      EVM_TRANSACTION_HISTORY_STORAGE_KEY,
      JSON.stringify(invalidItems),
    )
    expect(loadEvmTransactionHistory()).toEqual([])
  })

  it("dedupe according to hash and chainId when adding duplicate items", () => {
    addEvmTransactionHistoryItem(sampleItem1)
    expect(loadEvmTransactionHistory()).toHaveLength(1)

    const updatedItem1: EvmTransactionHistoryItem = {
      ...sampleItem1,
      status: "success",
      updatedAt: 1500,
    }
    addEvmTransactionHistoryItem(updatedItem1)

    const loaded = loadEvmTransactionHistory()
    expect(loaded).toHaveLength(1)
    expect(loaded[0]?.status).toBe("success")
  })

  it("Don't get confused when the hash is the same but the chainId is different", () => {
    addEvmTransactionHistoryItem(sampleItem1) // chainId: 11155111

    const sameHashMainnetItem: EvmTransactionHistoryItem = {
      ...sampleItem1,
      chainId: 1, // Ethereum Mainnet
      submittedAt: 1500,
    }
    addEvmTransactionHistoryItem(sameHashMainnetItem)

    const loaded = loadEvmTransactionHistory()
    expect(loaded).toHaveLength(2)
  })

  it("sort newest item first (submittedAt descending)", () => {
    addEvmTransactionHistoryItem(sampleItem1) // 1000
    addEvmTransactionHistoryItem(sampleItem2) // 2000

    const loaded = loadEvmTransactionHistory()
    expect(loaded[0]?.submittedAt).toBe(2000)
    expect(loaded[1]?.submittedAt).toBe(1000)
  })

  it("Maximum limit of 50 items in storage", () => {
    for (let i = 1; i <= 60; i++) {
      const hexIndex = i.toString(16).padStart(64, "0")
      const item: EvmTransactionHistoryItem = {
        hash: `0x${hexIndex}` as Hash,
        chainId: 11155111,
        account: ACCOUNT,
        action: "native-transfer",
        submittedAt: i * 1000,
        updatedAt: i * 1000,
        status: "success",
        assetSymbol: "ETH",
        amount: "1.0",
        recipient: RECIPIENT,
      }
      addEvmTransactionHistoryItem(item)
    }

    const loaded = loadEvmTransactionHistory()
    expect(loaded).toHaveLength(50)
    // The newest item (submittedAt = 60000) must be at the top
    expect(loaded[0]?.submittedAt).toBe(60000)
  })

  it("Update the correct item according to hash and chainId", () => {
    addEvmTransactionHistoryItem(sampleItem1)
    addEvmTransactionHistoryItem(sampleItem2)

    updateEvmTransactionHistoryItem(HASH_1, 11155111, { status: "success" })

    const loaded = loadEvmTransactionHistory()
    const item1 = loaded.find((x) => x.hash === HASH_1)
    expect(item1?.status).toBe("success")
  })

  it("Refuse to update patch containing invalid attributes", () => {
    addEvmTransactionHistoryItem(sampleItem1)

    // Intentionally updating an invalid patch (wrong status)
    updateEvmTransactionHistoryItem(HASH_1, 11155111, {
      status: "not-a-status" as unknown as EvmTransactionHistoryStatus,
    })

    const loaded = loadEvmTransactionHistory()
    expect(loaded[0]?.status).toBe("pending") // Do not apply error patch
  })

  it("clearEvmTransactionHistory operates on AND intersection when transmitting both account and chainId", () => {
    addEvmTransactionHistoryItem(sampleItem1) // ACCOUNT, chainId 11155111
    addEvmTransactionHistoryItem({
      ...sampleItem2,
      account: OTHER_ACCOUNT, // OTHER_ACCOUNT, chainId 11155111
    })
    addEvmTransactionHistoryItem({
      ...sampleItem1,
      hash: HASH_3,
      chainId: 1, // ACCOUNT, chainId 1
    })

    // Only delete items that belong to ACCOUNT and have chainId 11155111
    clearEvmTransactionHistory({ account: ACCOUNT, chainId: 11155111 })

    const remaining = loadEvmTransactionHistory()
    expect(remaining).toHaveLength(2)
    // Keep: ACCOUNT chainId 1, and OTHER_ACCOUNT chainId 11155111
    expect(remaining.find((x) => x.hash === HASH_3)).toBeDefined()
    expect(remaining.find((x) => x.hash === HASH_2)).toBeDefined()
  })

  it("does not crash and returns empty array when window.localStorage is intercepted with SecurityError", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new Error("SecurityError")
    })

    expect(loadEvmTransactionHistory()).toEqual([])
    expect(() => saveEvmTransactionHistory([sampleItem1])).not.toThrow()

    // Restore mock
    vi.restoreAllMocks()
  })
})
