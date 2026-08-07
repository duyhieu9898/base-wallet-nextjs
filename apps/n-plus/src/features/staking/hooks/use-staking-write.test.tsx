import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import {
  BaseError,
  UserRejectedRequestError,
  type Address,
  type Hash,
} from "viem"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { EVM_TRANSACTION_HISTORY_STORAGE_KEY } from "@nln/web3-evm"

import {
  type EvmSelection,
  type EvmTransactionHistoryItem,
  findEvmToken,
  getDefaultEvmNetwork,
} from "@nln/web3-evm"
import { findStakingDeployment } from "../contracts/staking-deployments"
import {
  loadStakingActivity,
  recordStakingActivity,
} from "../history/staking-activity.storage"
import {
  isTokenStakeAllowanceSufficient,
  useStakingWrite,
} from "./use-staking-write"

/**
 * `useStakingWrite` is the only Tier B consumer of the EVM foundation: it calls
 * Wagmi's write hook for its own contract, which `0015` allows precisely because
 * the feature routes every submission through `useEvmWriteLifecycle`. ESLint
 * cannot express that condition, so these tests are what holds it — they cover
 * the same invariants the three foundation slices cover for themselves.
 */

const CHAIN_ID = 11155111
const ACCOUNT: Address = "0x086d9feCB2F117369fAbDB884eC6851b36595444"
const OTHER_ACCOUNT: Address = "0x1111111111111111111111111111111111111111"
const TX_HASH: Hash =
  "0xcccc1111222233334444555566667777888899990000aaaabbbbccccddddeeee"

const network = getDefaultEvmNetwork()
const vault = findStakingDeployment(CHAIN_ID)
/** The vault's ERC-20 comes from its deployment; no test asserts a literal symbol. */
const stakingToken =
  vault.status === "active" ? findEvmToken(CHAIN_ID, vault.tokenAddress) : null

function readySelection(account: Address): EvmSelection {
  return {
    status: "ready",
    account,
    walletChainId: CHAIN_ID,
    chainId: CHAIN_ID,
    network,
    networks: [network],
  }
}

type SimulateParams = {
  account?: Address
  address?: Address
  functionName?: string
  args?: readonly unknown[]
  value?: bigint
}

let selection: EvmSelection = readySelection(ACCOUNT)
let allowanceData: bigint | undefined
let receiptData: { status: "success" | "reverted" } | undefined
let receiptErrorValue: Error | null = null
let simulateData: { request: Record<string, unknown> } | undefined
let simulateError: unknown = null
let lastSimulateParams: SimulateParams = {}
const mutateAsync = vi.fn(async () => TX_HASH)
const wagmiReset = vi.fn()

vi.mock("wagmi", () => ({
  useConnection: () => ({
    isConnected: selection.status === "ready",
    address: selection.status === "ready" ? selection.account : undefined,
    chainId: selection.status === "ready" ? selection.chainId : undefined,
    current: { connector: {} },
  }),
  useAccount: () => ({
    address: selection.status === "ready" ? selection.account : undefined,
    status: selection.status === "ready" ? "connected" : "disconnected",
  }),
  useChainId: () =>
    selection.status === "ready" ? selection.chainId : undefined,
  useReadContract: () => ({
    data: allowanceData,
    isPending: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useSimulateContract: (params: SimulateParams) => {
    lastSimulateParams = params
    return {
      data: simulateData,
      isPending: false,
      isSuccess: Boolean(simulateData),
      error: simulateError,
    }
  },
  useWriteContract: () => ({
    writeContractAsync: mutateAsync,
    mutateAsync,
    isPending: false,
    reset: wagmiReset,
  }),
  useWaitForTransactionReceipt: () => ({
    data: receiptData,
    isLoading: false,
    error: receiptErrorValue,
  }),
}))

/**
 * The storage key is foundation-internal, so this test reads it the way any
 * outside observer would. It must track `EVM_TRANSACTION_HISTORY_STORAGE_KEY`;
 * a version bump makes these assertions fail loudly rather than pass vacuously.
 */
function readHistory(): EvmTransactionHistoryItem[] {
  // Read through the exported key rather than a literal: a schema change bumps
  // the version (0012), and a hardcoded key would silently read nothing.
  const raw = window.localStorage.getItem(EVM_TRANSACTION_HISTORY_STORAGE_KEY)
  return raw ? (JSON.parse(raw) as EvmTransactionHistoryItem[]) : []
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  return Wrapper
}

function renderStakingWrite(options?: { onReceiptSuccess?(): void }) {
  return renderHook(() => useStakingWrite(options), {
    wrapper: createWrapper(),
  })
}

beforeEach(() => {
  selection = readySelection(ACCOUNT)
  allowanceData = undefined
  receiptData = undefined
  receiptErrorValue = null
  simulateData = undefined
  simulateError = null
  lastSimulateParams = {}
  mutateAsync.mockClear()
  mutateAsync.mockImplementation(async () => TX_HASH)
  wagmiReset.mockClear()
  window.localStorage.clear()
})

describe("token staking approval preflight", () => {
  it("keeps the primary stake unavailable while approval has no successful allowance evidence", () => {
    expect(isTokenStakeAllowanceSufficient(null, 1_000_000n)).toBe(false)
    expect(isTokenStakeAllowanceSufficient(999_999n, 1_000_000n)).toBe(false)
  })

  it("opens the primary stake only after the allowance read proves the approved amount", () => {
    // This is the state observed after a successful approval receipt invalidates
    // and refetches the allowance query.
    expect(isTokenStakeAllowanceSufficient(1_000_000n, 1_000_000n)).toBe(true)
  })

  it("refuses to prepare a token stake while the allowance read has no proof", () => {
    // An approval hash is not evidence: until the receipt lands and the
    // allowance query refetches, `allowance` is still what it was.
    allowanceData = undefined

    const { result } = renderStakingWrite()

    expect(() =>
      result.current.prepare({
        asset: "token",
        operation: "stake",
        amount: "100",
      }),
    ).toThrow(new RegExp(`Approve this ${stakingToken?.symbol} amount`))
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it("prepares the token stake once the allowance read covers the amount", () => {
    allowanceData = 100_000_000n

    const { result } = renderStakingWrite()

    act(() => {
      result.current.prepare({
        asset: "token",
        operation: "stake",
        amount: "100",
      })
    })

    expect(result.current.prepared).toMatchObject({
      functionName: "stakeUsdc",
      args: [100_000_000n],
      amount: 100_000_000n,
      assetSymbol: stakingToken?.symbol,
    })
  })
})

describe("useStakingWrite", () => {
  it("prepare builds the request and simulates with the connected account without opening the wallet", () => {
    const { result, rerender } = renderStakingWrite()

    act(() => {
      result.current.prepare({
        asset: "native",
        operation: "stake",
        amount: "1.5",
      })
    })
    rerender()

    expect(result.current.prepared).toMatchObject({
      functionName: "stakeNative",
      args: [],
      value: 1_500_000_000_000_000_000n,
      assetSymbol: network.chain.nativeCurrency.symbol,
    })
    expect(lastSimulateParams.account).toBe(ACCOUNT)
    expect(lastSimulateParams.functionName).toBe("stakeNative")
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it("double confirm does not send twice", async () => {
    const { result, rerender } = renderStakingWrite()

    simulateData = { request: { functionName: "stakeNative" } }
    act(() => {
      result.current.prepare({
        asset: "native",
        operation: "stake",
        amount: "1.0",
      })
    })
    rerender()

    await act(async () => {
      await result.current.confirm()
    })
    rerender()

    await act(async () => {
      await expect(result.current.confirm()).rejects.toThrow(
        "Transaction has already been submitted.",
      )
    })

    expect(mutateAsync).toHaveBeenCalledTimes(1)
  })

  it("stale selection does not bind a hash to the new account and does not lock the next operation", async () => {
    let resolveTx: (hash: Hash) => void = () => {}
    mutateAsync.mockImplementationOnce(
      () =>
        new Promise<Hash>((resolve) => {
          resolveTx = resolve
        }),
    )

    const { result, rerender } = renderStakingWrite()

    simulateData = { request: { functionName: "stakeNative" } }
    act(() => {
      result.current.prepare({
        asset: "native",
        operation: "stake",
        amount: "1.0",
      })
    })
    rerender()

    let confirmPromise: Promise<Hash>
    act(() => {
      confirmPromise = result.current.confirm()
    })

    // The account changes while the wallet modal is still open.
    selection = readySelection(OTHER_ACCOUNT)
    rerender()

    await act(async () => {
      resolveTx(TX_HASH)
      await confirmPromise
    })
    rerender()

    expect(result.current.hash).toBeNull()

    act(() => {
      result.current.prepare({
        asset: "native",
        operation: "stake",
        amount: "2.0",
      })
    })
    rerender()
    expect(result.current.prepared?.formattedAmount).toBe("2.0")

    mutateAsync.mockClear()
    await act(async () => {
      await result.current.confirm()
    })
    expect(mutateAsync).toHaveBeenCalledTimes(1)
  })

  it("treats a reverted receipt as terminal and lets reset reopen the flow", async () => {
    const { result, rerender } = renderStakingWrite()

    simulateData = { request: { functionName: "stakeNative" } }
    act(() => {
      result.current.prepare({
        asset: "native",
        operation: "stake",
        amount: "1.0",
      })
    })
    rerender()

    await act(async () => {
      await result.current.confirm()
    })

    receiptData = { status: "reverted" }
    rerender()

    expect(result.current.status).toBe("reverted")
    expect(result.current.error?.code).toBe("TRANSACTION_REVERTED")

    // A terminal outcome must be recoverable — otherwise the panel keeps a dead
    // transaction on screen with no way back.
    receiptData = undefined
    act(() => {
      result.current.reset()
    })
    rerender()

    expect(result.current.prepared).toBeNull()
    expect(result.current.hash).toBeNull()

    act(() => {
      result.current.prepare({
        asset: "native",
        operation: "stake",
        amount: "3.0",
      })
    })
    rerender()
    expect(result.current.prepared?.formattedAmount).toBe("3.0")
  })

  it("refuses reset and prepare while the receipt is still pending", async () => {
    const { result, rerender } = renderStakingWrite()

    simulateData = { request: { functionName: "stakeNative" } }
    act(() => {
      result.current.prepare({
        asset: "native",
        operation: "stake",
        amount: "1.0",
      })
    })
    rerender()

    await act(async () => {
      await result.current.confirm()
    })
    rerender()

    expect(() => result.current.reset()).toThrow(
      "Cannot replace or reset an active transaction.",
    )
    expect(() =>
      result.current.prepare({
        asset: "native",
        operation: "stake",
        amount: "2.0",
      }),
    ).toThrow("Cannot replace or reset an active transaction.")
  })

  it("runs the receipt callback exactly once per hash across rerenders", async () => {
    const calls: string[] = []

    const { result, rerender } = renderHook(
      ({ tag }: { tag: string }) =>
        useStakingWrite({ onReceiptSuccess: () => calls.push(tag) }),
      { wrapper: createWrapper(), initialProps: { tag: "initial" } },
    )

    simulateData = { request: { functionName: "stakeNative" } }
    act(() => {
      result.current.prepare({
        asset: "native",
        operation: "stake",
        amount: "1.0",
      })
    })
    rerender({ tag: "initial" })

    await act(async () => {
      await result.current.confirm()
    })

    receiptData = { status: "success" }
    rerender({ tag: "initial" })

    await waitFor(() => expect(calls).toHaveLength(1))

    rerender({ tag: "updated" })
    rerender({ tag: "updated" })

    expect(calls).toEqual(["initial"])
  })

  it("records the submitted stake in local history as pending", async () => {
    const { result, rerender } = renderStakingWrite()

    simulateData = { request: { functionName: "stakeNative" } }
    act(() => {
      result.current.prepare({
        asset: "native",
        operation: "stake",
        amount: "1.5",
      })
    })
    rerender()

    await act(async () => {
      await result.current.confirm()
    })

    // 0012 requires every write hook to persist a pending item as soon as it has
    // a hash. Staking used to skip this, so stakes never reached the history card.
    //
    // The record is now two-tier: the foundation stores what the transaction did,
    // the feature stores why. Both halves must be written, and the mechanical half
    // must not carry business vocabulary.
    expect(readHistory()).toEqual([
      expect.objectContaining({
        hash: TX_HASH,
        chainId: CHAIN_ID,
        account: ACCOUNT,
        kind: "contract-write",
        contractAddress:
          vault.status === "active" ? vault.contractAddress : undefined,
        status: "pending",
        amount: "1.5",
        assetSymbol: network.chain.nativeCurrency.symbol,
      }),
    ])
    expect(readHistory()[0]).not.toHaveProperty("tokenAddress")
    expect(readHistory()[0]).not.toHaveProperty("operation")

    expect(loadStakingActivity()).toEqual([
      expect.objectContaining({
        id: TX_HASH,
        transactionHash: TX_HASH,
        feature: "staking",
        action: "stake",
      }),
    ])
  })

  it("keeps the transaction recorded when the feature activity store fails", async () => {
    // Invariant: a feature activity write failure must not change the transaction
    // outcome, and must not take the mechanical record down with it. A stake with
    // no activity record still displays as a generic contract write.
    const { result, rerender } = renderStakingWrite()

    simulateData = { request: { functionName: "stakeNative" } }
    act(() => {
      result.current.prepare({
        asset: "native",
        operation: "stake",
        amount: "1.5",
      })
    })
    rerender()

    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation((key: string) => {
        if (key.startsWith("staking:activity")) {
          throw new Error("QuotaExceededError")
        }
      })

    let hash: string | undefined
    await act(async () => {
      hash = await result.current.confirm()
    })
    setItem.mockRestore()

    expect(hash).toBe(TX_HASH)
    expect(result.current.error).toBeNull()
  })

  it("does not record the same staking operation twice", async () => {
    // Idempotent by operation ID: composing the two stores at display time must
    // not be able to produce a duplicate row.
    recordStakingActivity({
      id: TX_HASH,
      transactionHash: TX_HASH,
      feature: "staking",
      action: "stake",
      createdAt: 1000,
    })
    recordStakingActivity({
      id: TX_HASH,
      transactionHash: TX_HASH,
      feature: "staking",
      action: "unstake",
      createdAt: 2000,
    })

    expect(loadStakingActivity()).toHaveLength(1)
    expect(loadStakingActivity()[0]?.action).toBe("stake")
  })

  it("records a token stake with the token address the invalidation needs", async () => {
    allowanceData = 100_000_000n

    const { result, rerender } = renderStakingWrite()

    simulateData = { request: { functionName: "stakeUsdc" } }
    act(() => {
      result.current.prepare({
        asset: "token",
        operation: "stake",
        amount: "100",
      })
    })
    rerender()

    await act(async () => {
      await result.current.confirm()
    })

    expect(stakingToken?.address).toBeDefined()

    // Registry-canonical casing: Wagmi compares query keys as strings, so a
    // lowercase address here would invalidate nothing and fail silently.
    expect(readHistory()[0]).toMatchObject({
      kind: "contract-write",
      assetSymbol: stakingToken?.symbol,
      tokenAddress: stakingToken?.address,
    })
    expect(loadStakingActivity()[0]).toMatchObject({
      transactionHash: TX_HASH,
      feature: "staking",
      action: "stake",
    })
  })

  it("settles the history item from receipt evidence, not from the hash", async () => {
    const { result, rerender } = renderStakingWrite()

    simulateData = { request: { functionName: "stakeNative" } }
    act(() => {
      result.current.prepare({
        asset: "native",
        operation: "stake",
        amount: "1.0",
      })
    })
    rerender()

    await act(async () => {
      await result.current.confirm()
    })
    expect(readHistory()[0]?.status).toBe("pending")

    receiptData = { status: "reverted" }
    rerender()

    await waitFor(() => expect(readHistory()[0]?.status).toBe("reverted"))
  })

  it("invalidates the account's reads once the receipt proves success", async () => {
    const invalidate = vi.spyOn(QueryClient.prototype, "invalidateQueries")

    const { result, rerender } = renderStakingWrite()

    simulateData = { request: { functionName: "stakeNative" } }
    act(() => {
      result.current.prepare({
        asset: "native",
        operation: "stake",
        amount: "1.0",
      })
    })
    rerender()

    await act(async () => {
      await result.current.confirm()
    })
    invalidate.mockClear()

    receiptData = { status: "success" }
    rerender()

    // Refetching the vault position alone leaves the wallet balance stale, which
    // is what the panel showed before staking invalidated anything.
    await waitFor(() => expect(invalidate).toHaveBeenCalled())
    invalidate.mockRestore()
  })

  it("writes no history when the wallet request is rejected", async () => {
    mutateAsync.mockRejectedValueOnce(
      new BaseError("User rejected request", {
        cause: new UserRejectedRequestError(new Error("User denied")),
      }),
    )

    const { result, rerender } = renderStakingWrite()

    simulateData = { request: { functionName: "stakeNative" } }
    act(() => {
      result.current.prepare({
        asset: "native",
        operation: "stake",
        amount: "1.0",
      })
    })
    rerender()

    await act(async () => {
      await expect(result.current.confirm()).rejects.toThrow()
    })

    expect(readHistory()).toEqual([])
  })

  it("does not report a rejected submission as a mined revert", async () => {
    mutateAsync.mockRejectedValueOnce(
      new BaseError("User rejected request", {
        cause: new UserRejectedRequestError(new Error("User denied")),
      }),
    )

    const { result, rerender } = renderStakingWrite()

    simulateData = { request: { functionName: "stakeNative" } }
    act(() => {
      result.current.prepare({
        asset: "native",
        operation: "stake",
        amount: "1.0",
      })
    })
    rerender()

    await act(async () => {
      await expect(result.current.confirm()).rejects.toThrow()
    })
    rerender()

    expect(result.current.status).toBe("rejected")
    expect(result.current.receiptStatus).toBeNull()
    expect(result.current.hash).toBeNull()

    // The failure is recoverable: no hash was produced, so nothing is in flight.
    await act(async () => {
      await result.current.confirm()
    })
    expect(result.current.hash).toBe(TX_HASH)
  })
})
