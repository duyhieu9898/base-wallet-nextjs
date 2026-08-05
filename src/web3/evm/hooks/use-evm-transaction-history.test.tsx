import { act, renderHook, waitFor } from "@testing-library/react"
import type { Address, Hash } from "viem"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { getDefaultEvmNetwork } from "@/web3/evm/chain/registry/evm-registry.adapter"
import { useEvmTransactionHistory } from "@/web3/evm/hooks/use-evm-transaction-history"

import type { EvmSelection } from "@/web3/evm/chain/selection/evm-selection"
import { addEvmTransactionHistoryItem } from "@/web3/evm/storage/evm-transaction-history.storage"
import type { EvmTransactionHistoryItem } from "@/web3/evm/types/evm-transaction-history"

const CHAIN_ID = 11155111
const ACCOUNT: Address = "0x086d9feCB2F117369fAbDB884eC6851b36595444"
const OTHER_ACCOUNT: Address = "0x1111111111111111111111111111111111111111"
const RECIPIENT: Address = "0x2222222222222222222222222222222222222222"
const USDC_SEPOLIA: Address = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"

const HASH_1: Hash =
  "0xaaaa1111222233334444555566667777888899990000aaaabbbbccccddddeeee"
const HASH_2: Hash =
  "0xbbbb1111222233334444555566667777888899990000aaaabbbbccccddddeeee"

const network = getDefaultEvmNetwork()

const readySelection: EvmSelection = {
  status: "ready",
  account: ACCOUNT,
  walletChainId: CHAIN_ID,
  chainId: CHAIN_ID,
  network,
  networks: [network],
}

let selection: EvmSelection = readySelection

vi.mock("@/web3/evm/chain/selection/use-evm-selection", () => ({
  useEvmSelection: () => selection,
}))

const sampleItem1: EvmTransactionHistoryItem = {
  hash: HASH_1,
  chainId: CHAIN_ID,
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
  chainId: 1, // Mainnet
  account: OTHER_ACCOUNT,
  action: "token-transfer",
  tokenAddress: USDC_SEPOLIA,
  submittedAt: 2000,
  updatedAt: 2000,
  status: "success",
  assetSymbol: "USDC",
  amount: "10.0",
  recipient: RECIPIENT,
}

describe("useEvmTransactionHistory", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      window.localStorage.clear()
    }
    selection = readySelection
  })

  it("returns the correct list of transactions and pendingTransactions", async () => {
    addEvmTransactionHistoryItem(sampleItem1)
    addEvmTransactionHistoryItem(sampleItem2)

    const { result } = renderHook(() => useEvmTransactionHistory())

    await waitFor(() => {
      expect(result.current.transactions).toHaveLength(2)
    })
    expect(result.current.pendingTransactions).toHaveLength(1)
    expect(result.current.pendingTransactions[0]?.hash).toBe(HASH_1)
  })

  it("Filter by current account and current chainId when the option is enabled", async () => {
    addEvmTransactionHistoryItem(sampleItem1) // Sepolia + ACCOUNT
    addEvmTransactionHistoryItem(sampleItem2) // Mainnet + OTHER_ACCOUNT

    const { result } = renderHook(() =>
      useEvmTransactionHistory({
        filterCurrentAccount: true,
        filterCurrentChain: true,
      }),
    )

    await waitFor(() => {
      expect(result.current.transactions).toHaveLength(1)
    })
    expect(result.current.transactions[0]?.hash).toBe(HASH_1)
  })

  it("supports addTransaction and updateTransaction directly via hooks", async () => {
    const { result } = renderHook(() => useEvmTransactionHistory())

    act(() => {
      result.current.addTransaction(sampleItem1)
    })

    expect(result.current.transactions).toHaveLength(1)
    expect(result.current.transactions[0]?.status).toBe("pending")

    act(() => {
      result.current.updateTransaction(HASH_1, CHAIN_ID, { status: "success" })
    })

    expect(result.current.transactions[0]?.status).toBe("success")
    expect(result.current.pendingTransactions).toHaveLength(0)
  })

  it("clearTransactions support", async () => {
    addEvmTransactionHistoryItem(sampleItem1)
    const { result } = renderHook(() => useEvmTransactionHistory())

    await waitFor(() => {
      expect(result.current.transactions).toHaveLength(1)
    })

    act(() => {
      result.current.clearTransactions()
    })

    expect(result.current.transactions).toHaveLength(0)
  })
})
