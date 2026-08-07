import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import {
  BaseError,
  ContractFunctionRevertedError,
  UserRejectedRequestError,
  type Address,
  type Hash,
} from "viem"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { getBalanceQueryKey } from "wagmi/query"

import { standardErc20Abi } from "../../abi/erc20"
import { getDefaultEvmNetwork } from "../../chain/registry/evm-registry.adapter"
import type { EvmSelection } from "../../chain/selection/evm-selection"
import { EvmWeb3Error } from "../../errors/evm-errors"
import { useSendEvmNative } from "./use-send-evm-native"
import { useEvmTransactionHistory } from "../history/use-evm-transaction-history"
import { loadEvmTransactionHistory } from "../history/evm-transaction-history.storage"

const CHAIN_ID = 11155111
const ACCOUNT: Address = "0x086d9feCB2F117369fAbDB884eC6851b36595444"
const OTHER_ACCOUNT: Address = "0x1111111111111111111111111111111111111111"
const RECIPIENT: Address = "0x2222222222222222222222222222222222222222"
const TX_HASH: Hash =
  "0xaaaa1111222233334444555566667777888899990000aaaabbbbccccddddeeee"
const TX_HASH_B: Hash =
  "0xbbbb1111222233334444555566667777888899990000aaaabbbbccccddddeeee"

const network = getDefaultEvmNetwork()

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

function readySelection(
  account: Address,
  chainId: number = CHAIN_ID,
): EvmSelection {
  return {
    status: "ready",
    account,
    walletChainId: chainId,
    chainId: chainId,
    network,
    networks: [network],
  }
}

const disconnectedSelection: EvmSelection = {
  status: "disconnected",
  account: null,
  walletChainId: null,
  chainId: CHAIN_ID,
  network,
  networks: [network],
}

let selection: EvmSelection = readySelection(ACCOUNT)
let receiptData: { status: "success" | "reverted" } | undefined
let receiptError: Error | null = null
let writeError: unknown
const mutateAsync = vi.fn(async () => {
  if (writeError) throw writeError
  return TX_HASH
})
const wagmiReset = vi.fn()

vi.mock("wagmi", () => ({
  useSendTransaction: () => ({
    mutateAsync,
    isPending: false,
    reset: wagmiReset,
  }),
  useWaitForTransactionReceipt: () => ({
    data: receiptData,
    isLoading: false,
    error: receiptError,
  }),
  useEstimateGas: () => ({
    data: 21000n,
    isPending: false,
    isSuccess: true,
    error: null,
  }),
  useEstimateFeesPerGas: () => ({
    data: { maxFeePerGas: 20000000000n, gasPrice: 15000000000n },
    isPending: false,
    isSuccess: true,
    error: null,
  }),
}))

vi.mock("../../chain/selection/use-evm-selection", () => ({
  useEvmSelection: () => selection,
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  return { Wrapper, invalidateSpy }
}

beforeEach(() => {
  selection = readySelection(ACCOUNT)
  receiptData = undefined
  receiptError = null
  writeError = undefined
  mutateAsync.mockClear()
  wagmiReset.mockClear()
})

describe("useSendEvmNative", () => {
  it("prepare creates a correct review and does not submit the transaction itself", () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useSendEvmNative(), {
      wrapper: Wrapper,
    })

    expect(result.current.review).toBeNull()

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.001" })
    })

    expect(result.current.review).toEqual({
      action: "native-transfer",
      chainId: CHAIN_ID,
      account: ACCOUNT,
      recipient: RECIPIENT,
      amount: "0.001",
      rawAmount: 1_000_000_000_000_000n,
      assetSymbol: "ETH",
      networkName: "Sepolia",
      isMainnet: false,
    })

    // Review does not automatically trigger transaction sending
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it("send the transaction after confirmSend and keep the hash", async () => {
    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(() => useSendEvmNative(), {
      wrapper: Wrapper,
    })

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.001" })
    })
    rerender()

    await act(async () => {
      await result.current.confirmSend()
    })

    expect(mutateAsync).toHaveBeenCalledWith({
      to: RECIPIENT,
      value: 1_000_000_000_000_000n,
      chainId: CHAIN_ID,
    })
    expect(result.current.hash).toBe(TX_HASH)
  })

  it("throws EvmWeb3Error when confirmSend is not prepared", async () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useSendEvmNative(), {
      wrapper: Wrapper,
    })

    await expect(result.current.confirmSend()).rejects.toThrowError(
      EvmWeb3Error,
    )
  })

  it("reset deletes reviews and requests", () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useSendEvmNative(), {
      wrapper: Wrapper,
    })

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.001" })
    })
    expect(result.current.review).not.toBeNull()

    act(() => {
      result.current.reset()
    })

    expect(result.current.review).toBeNull()
  })

  it("reset review when account changes", () => {
    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(() => useSendEvmNative(), {
      wrapper: Wrapper,
    })

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.001" })
    })
    expect(result.current.review).not.toBeNull()

    selection = readySelection(OTHER_ACCOUNT)
    rerender()

    expect(result.current.review).toBeNull()
  })

  it("throws EvmWeb3Error code SELECTION_NOT_READY when selection disconnected", () => {
    selection = disconnectedSelection
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useSendEvmNative(), {
      wrapper: Wrapper,
    })

    expect(() =>
      result.current.prepare({ to: RECIPIENT, amount: "0.001" }),
    ).toThrowError(EvmWeb3Error)
  })

  it("throws EvmWeb3Error code UNSUPPORTED_CHAIN ​​when selection unsupported", () => {
    selection = {
      status: "unsupported",
      account: ACCOUNT,
      walletChainId: 999999,
      chainId: null,
      network: null,
      networks: [network],
    }
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useSendEvmNative(), {
      wrapper: Wrapper,
    })

    expect(() =>
      result.current.prepare({ to: RECIPIENT, amount: "0.001" }),
    ).toThrowError(EvmWeb3Error)
  })

  it("change wallet rejection to TRANSACTION_REJECTED", async () => {
    writeError = new BaseError("Failed to send transaction.", {
      cause: new UserRejectedRequestError(new Error("User denied")),
    })

    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(() => useSendEvmNative(), {
      wrapper: Wrapper,
    })

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.001" })
    })
    rerender()

    let caught: unknown
    await act(async () => {
      caught = await result.current.confirmSend().catch((error) => error)
    })

    expect(caught).toBeInstanceOf(EvmWeb3Error)
    expect((caught as EvmWeb3Error).code).toBe("TRANSACTION_REJECTED")
    expect(result.current.hash).toBeNull()
  })

  it("contract execution error in submission is TRANSACTION_FAILED, not mined revert", async () => {
    const reverted = new ContractFunctionRevertedError({
      abi: standardErc20Abi,
      functionName: "transfer",
    })
    reverted.reason = "ERC20: transfer amount exceeds balance"
    writeError = new BaseError("Failed to send transaction.", {
      cause: reverted,
    })

    // localStorage is not reset between tests, so compare by delta
    const historyCountBefore = loadEvmTransactionHistory().length

    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(() => useSendEvmNative(), {
      wrapper: Wrapper,
    })

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.001" })
    })
    rerender()

    let caught: unknown
    await act(async () => {
      caught = await result.current.confirmSend().catch((error) => error)
    })

    expect(caught).toMatchObject({ code: "TRANSACTION_FAILED" })
    expect(result.current.error).toMatchObject({ code: "TRANSACTION_FAILED" })
    expect(result.current.error?.message).toContain(
      "ERC20: transfer amount exceeds balance",
    )
    expect(result.current.status).toBe("error")
    expect(result.current.hash).toBeNull()
    expect(loadEvmTransactionHistory()).toHaveLength(historyCountBefore)
  })

  it("invalidate native balance exactly once for each hash upon receipt success", async () => {
    const { Wrapper, invalidateSpy } = createWrapper()
    const onReceiptSuccess = vi.fn()
    const { result, rerender } = renderHook(
      () => useSendEvmNative({ onReceiptSuccess }),
      { wrapper: Wrapper },
    )

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.001" })
    })
    rerender()

    await act(async () => {
      await result.current.confirmSend()
    })

    expect(invalidateSpy).not.toHaveBeenCalled()

    receiptData = { status: "success" }
    rerender()

    await waitFor(() => expect(onReceiptSuccess).toHaveBeenCalledTimes(1))
    expect(invalidateSpy).toHaveBeenCalledTimes(1)
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getBalanceQueryKey({ address: ACCOUNT, chainId: CHAIN_ID }),
    })

    // Render again does not call back the callback
    rerender()
    expect(onReceiptSuccess).toHaveBeenCalledTimes(1)
  })

  it("Do not invalidate when receipt is reverted", async () => {
    const { Wrapper, invalidateSpy } = createWrapper()
    const onReceiptSuccess = vi.fn()
    const { result, rerender } = renderHook(
      () => useSendEvmNative({ onReceiptSuccess }),
      { wrapper: Wrapper },
    )

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.001" })
    })
    rerender()

    await act(async () => {
      await result.current.confirmSend()
    })

    receiptData = { status: "reverted" }
    rerender()

    expect(onReceiptSuccess).not.toHaveBeenCalled()
    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it("The callback does not run again just because the identity of onReceiptSuccess changes", async () => {
    const { Wrapper } = createWrapper()
    const calls: string[] = []
    const { result, rerender } = renderHook(
      ({ tag }: { tag: string }) =>
        useSendEvmNative({ onReceiptSuccess: () => calls.push(tag) }),
      { wrapper: Wrapper, initialProps: { tag: "first" } },
    )

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.001" })
    })
    rerender({ tag: "first" })

    await act(async () => {
      await result.current.confirmSend()
    })

    receiptData = { status: "success" }
    rerender({ tag: "first" })
    await waitFor(() => expect(calls).toHaveLength(1))

    rerender({ tag: "second" })
    expect(calls).toEqual(["first"])
  })

  it("Record the pending transaction in the history immediately after confirmSend is successful and in the same tab received", async () => {
    // Clear storage before test
    if (typeof window !== "undefined") {
      window.localStorage.clear()
    }

    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      () => {
        const send = useSendEvmNative()
        const history = useEvmTransactionHistory({
          filterCurrentAccount: true,
          filterCurrentChain: true,
        })
        return { send, history }
      },
      { wrapper: Wrapper },
    )

    // Empty start
    expect(result.current.history.transactions).toHaveLength(0)

    act(() => {
      result.current.send.prepare({ to: RECIPIENT, amount: "0.001" })
    })
    rerender()

    await act(async () => {
      await result.current.send.confirmSend()
    })
    rerender()

    // Check out the history hook that gets the item immediately in the same tab
    expect(result.current.history.transactions).toHaveLength(1)
    expect(result.current.history.transactions[0]).toEqual(
      expect.objectContaining({
        hash: TX_HASH,
        status: "pending",
        kind: "native-transfer",
        amount: "0.001",
      }),
    )
  })

  it("status is 'ready' right after prepare() — no simulation needed", () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useSendEvmNative(), {
      wrapper: Wrapper,
    })

    expect(result.current.status).toBe("idle")

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.001" })
    })

    expect(result.current.status).toBe("ready")
  })

  it("double confirm does not send the transaction twice", async () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useSendEvmNative(), {
      wrapper: Wrapper,
    })

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.001" })
    })

    mutateAsync.mockClear()

    // Fire both confirms simultaneously — second must be blocked
    await act(async () => {
      const [, second] = await Promise.allSettled([
        result.current.confirmSend(),
        result.current.confirmSend(),
      ])
      expect(second.status).toBe("rejected")
      if (second.status === "rejected") {
        expect((second.reason as Error).message).toContain(
          "already been submitted",
        )
      }
    })

    expect(mutateAsync).toHaveBeenCalledTimes(1)
  })

  it("confirm when the hash already exists is rejected with an error code TRANSACTION_FAILED", async () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useSendEvmNative(), {
      wrapper: Wrapper,
    })

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.001" })
    })

    // First confirm sets hash
    await act(async () => {
      await result.current.confirmSend()
    })

    expect(result.current.hash).toBe(TX_HASH)

    // Second confirm with hash already set
    await act(async () => {
      await expect(result.current.confirmSend()).rejects.toMatchObject({
        code: "TRANSACTION_FAILED",
      })
    })

    expect(mutateAsync).toHaveBeenCalledTimes(1)
  })

  it("Block prepare() when transaction is active", async () => {
    let resolveTx: (hash: Hash) => void = () => {}
    mutateAsync.mockImplementationOnce(
      () =>
        new Promise<Hash>((resolve) => {
          resolveTx = resolve
        }),
    )

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useSendEvmNative(), {
      wrapper: Wrapper,
    })

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.001" })
    })

    let confirmPromise: Promise<Hash>
    act(() => {
      confirmPromise = result.current.confirmSend()
    })

    // Calling prepare while confirmSend is in-flight must throw
    expect(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.002" })
    }).toThrow("Cannot replace or reset an active transaction.")

    await act(async () => {
      resolveTx(TX_HASH)
      await confirmPromise
    })
  })

  it("Block reset() when transaction is active", async () => {
    let resolveTx: (hash: Hash) => void = () => {}
    mutateAsync.mockImplementationOnce(
      () =>
        new Promise<Hash>((resolve) => {
          resolveTx = resolve
        }),
    )

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useSendEvmNative(), {
      wrapper: Wrapper,
    })

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.001" })
    })

    let confirmPromise: Promise<Hash>
    act(() => {
      confirmPromise = result.current.confirmSend()
    })

    // Calling reset while confirmSend is in-flight must throw
    expect(() => {
      result.current.reset()
    }).toThrow("Cannot replace or reset an active transaction.")

    await act(async () => {
      resolveTx(TX_HASH)
      await confirmPromise
    })
  })

  it("changing selection before mutateAsync resolve ignores the old hash", async () => {
    let resolveTx: (hash: Hash) => void = () => {}
    mutateAsync.mockImplementationOnce(
      () =>
        new Promise<Hash>((resolve) => {
          resolveTx = resolve
        }),
    )

    let currentAccount = ACCOUNT
    selection = readySelection(currentAccount)

    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(() => useSendEvmNative(), {
      wrapper: Wrapper,
    })

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.001" })
    })

    let confirmPromise: Promise<Hash>
    act(() => {
      confirmPromise = result.current.confirmSend()
    })

    // Simulate account change while prompt was open
    currentAccount = OTHER_ACCOUNT
    selection = readySelection(currentAccount)
    rerender()

    await act(async () => {
      resolveTx(TX_HASH)
      await confirmPromise
    })

    // Hash should not be attached to the new selection
    expect(result.current.hash).toBeNull()

    // History item should still be saved for the original account snapshot
    const items = loadEvmTransactionHistory().filter(
      (item) => item.chainId === CHAIN_ID && item.account === ACCOUNT,
    )
    expect(items).toHaveLength(1)
    expect(items[0].hash).toBe(TX_HASH)
  })

  it("Allow reset() and prepare() new transactions after receipt reaches terminal status (success or reverted)", async () => {
    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(() => useSendEvmNative(), {
      wrapper: Wrapper,
    })

    // 1. Prepare & Confirm first transaction
    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.001" })
    })
    await act(async () => {
      await result.current.confirmSend()
    })

    // Receipt success
    receiptData = { status: "success" }
    rerender()

    // reset() works after success
    act(() => {
      result.current.reset()
    })
    expect(result.current.review).toBeNull()

    // prepare() next transaction works after success
    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.002" })
    })
    expect(result.current.review?.amount).toBe("0.002")

    // Confirm second transaction
    await act(async () => {
      await result.current.confirmSend()
    })

    // Receipt reverted
    receiptData = { status: "reverted" }
    rerender()

    // reset() works after reverted
    act(() => {
      result.current.reset()
    })
    expect(result.current.review).toBeNull()

    // prepare() next transaction works after reverted
    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.003" })
    })
    expect(result.current.review?.amount).toBe("0.003")
  })

  it("Block reset() and prepare() when the hash is available but the receipt is pending", async () => {
    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(() => useSendEvmNative(), {
      wrapper: Wrapper,
    })

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.001" })
    })
    await act(async () => {
      await result.current.confirmSend()
    })

    // Receipt is pending (undefined status)
    receiptData = undefined
    rerender()

    expect(() => {
      result.current.reset()
    }).toThrow("Cannot replace or reset an active transaction.")

    expect(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.002" })
    }).toThrow("Cannot replace or reset an active transaction.")
  })

  it("Allows reset/stopTrackingReceipt/prepare when receipt has RPC error/timeout while still keeping pending history", async () => {
    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(() => useSendEvmNative(), {
      wrapper: Wrapper,
    })

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.001" })
    })
    await act(async () => {
      await result.current.confirmSend()
    })

    expect(result.current.hash).toBe(TX_HASH)

    // Simulate RPC timeout / transport error on receipt query
    receiptData = undefined
    receiptError = new Error("RPC Timeout waiting for receipt")
    rerender()

    expect(result.current.status).toBe("error")
    expect(result.current.receiptError).not.toBeNull()

    // Stop tracking clears local state and releases submission lock
    act(() => {
      result.current.stopTrackingReceipt()
    })
    expect(result.current.hash).toBeNull()
    expect(result.current.review).toBeNull()
    expect(result.current.status).toBe("idle")

    // History item must still remain pending
    const items = loadEvmTransactionHistory().filter(
      (item) => item.chainId === CHAIN_ID && item.account === ACCOUNT,
    )
    expect(items).toHaveLength(1)
    expect(items[0].hash).toBe(TX_HASH)
    expect(items[0].status).toBe("pending")

    // Preparing a new transaction succeeds after stopTrackingReceipt
    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.002" })
    })
    expect(result.current.review?.amount).toBe("0.002")
    expect(result.current.status).toBe("ready")

    // Confirming new transaction works
    mutateAsync.mockClear()
    await act(async () => {
      await result.current.confirmSend()
    })
    expect(mutateAsync).toHaveBeenCalledTimes(1)
  })

  it("Changing the selection when the mutation rejects the caller receives a typed error but the new selection does not receive the old submissionError", async () => {
    let rejectTx: (err: Error) => void = () => {}
    mutateAsync.mockImplementationOnce(
      () =>
        new Promise<Hash>((_, reject) => {
          rejectTx = reject
        }),
    )

    let currentAccount = ACCOUNT
    selection = readySelection(currentAccount)

    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(() => useSendEvmNative(), {
      wrapper: Wrapper,
    })

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.001" })
    })

    let confirmPromise: Promise<Hash>
    act(() => {
      confirmPromise = result.current.confirmSend()
    })

    // User switches account while wallet modal prompt is pending
    currentAccount = OTHER_ACCOUNT
    selection = readySelection(currentAccount)
    rerender()

    // User denies prompt on wallet
    const walletErr = new BaseError("User rejected prompt", {
      cause: new UserRejectedRequestError(new Error("User denied")),
    })

    let thrownError: unknown
    await act(async () => {
      rejectTx(walletErr)
      try {
        await confirmPromise
      } catch (e) {
        thrownError = e
      }
    })

    // Caller still receives typed error
    expect(thrownError).toBeInstanceOf(EvmWeb3Error)
    expect((thrownError as EvmWeb3Error).code).toBe("TRANSACTION_REJECTED")

    // New selection state must NOT receive the old selection's error
    expect(result.current.error).toBeNull()
  })

  it("blocks sequential confirm calls from the same render callback", async () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useSendEvmNative(), {
      wrapper: Wrapper,
    })

    act(() => {
      result.current.prepare({
        to: RECIPIENT,
        amount: "0.001",
      })
    })

    const confirmFromPreparedRender = result.current.confirmSend

    mutateAsync.mockClear()

    await act(async () => {
      await confirmFromPreparedRender()

      await expect(confirmFromPreparedRender()).rejects.toMatchObject({
        code: "TRANSACTION_FAILED",
      })
    })

    expect(mutateAsync).toHaveBeenCalledTimes(1)
  })

  it("stale selection does not lock new selection when old mutation resolves", async () => {
    let resolveTx: (hash: Hash) => void = () => {}
    mutateAsync.mockImplementationOnce(
      () =>
        new Promise<Hash>((resolve) => {
          resolveTx = resolve
        }),
    )

    let currentAccount = ACCOUNT
    selection = readySelection(currentAccount)

    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(() => useSendEvmNative(), {
      wrapper: Wrapper,
    })

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.001" })
    })

    let confirmPromise: Promise<Hash>
    act(() => {
      confirmPromise = result.current.confirmSend()
    })

    currentAccount = OTHER_ACCOUNT
    selection = readySelection(currentAccount)
    rerender()

    await act(async () => {
      resolveTx(TX_HASH)
      await confirmPromise
    })

    expect(result.current.hash).toBeNull()

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.002" })
    })
    expect(result.current.review?.amount).toBe("0.002")

    mutateAsync.mockClear()
    await act(async () => {
      await result.current.confirmSend()
    })
    expect(mutateAsync).toHaveBeenCalledTimes(1)
  })

  it("clears submitted and in-flight refs on mutation reject allowing subsequent prepare/confirm", async () => {
    mutateAsync.mockRejectedValueOnce(
      new BaseError("User rejected request", {
        cause: new UserRejectedRequestError(new Error("User denied")),
      }),
    )

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useSendEvmNative(), {
      wrapper: Wrapper,
    })

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.001" })
    })

    await act(async () => {
      await expect(result.current.confirmSend()).rejects.toThrow()
    })

    expect(result.current.status).toBe("rejected")

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.001" })
    })

    mutateAsync.mockResolvedValueOnce(TX_HASH)
    await act(async () => {
      await result.current.confirmSend()
    })
    expect(result.current.hash).toBe(TX_HASH)
  })

  it("stale resolved operation does not release the active operation lock", async () => {
    window.localStorage.clear()

    const operationA = createDeferred<Hash>()
    const operationB = createDeferred<Hash>()

    mutateAsync
      .mockImplementationOnce(() => operationA.promise)
      .mockImplementationOnce(() => operationB.promise)

    selection = readySelection(ACCOUNT)

    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(() => useSendEvmNative(), {
      wrapper: Wrapper,
    })

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.001" })
    })

    let confirmAPromise!: Promise<Hash>
    act(() => {
      confirmAPromise = result.current.confirmSend()
    })

    selection = readySelection(OTHER_ACCOUNT)
    rerender()

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.002" })
    })

    const confirmB = result.current.confirmSend
    let confirmBPromise!: Promise<Hash>
    act(() => {
      confirmBPromise = confirmB()
    })

    await act(async () => {
      operationA.resolve(TX_HASH)
      await confirmAPromise
    })

    // Operation A resolving must not unlock the still-pending operation B
    await act(async () => {
      await expect(confirmB()).rejects.toMatchObject({
        code: "TRANSACTION_FAILED",
      })
    })

    expect(mutateAsync).toHaveBeenCalledTimes(2)

    await act(async () => {
      operationB.resolve(TX_HASH_B)
      await confirmBPromise
    })

    expect(result.current.hash).toBe(TX_HASH_B)

    const history = loadEvmTransactionHistory()
    const itemsA = history.filter(
      (item) => item.chainId === CHAIN_ID && item.account === ACCOUNT,
    )
    const itemsB = history.filter(
      (item) => item.chainId === CHAIN_ID && item.account === OTHER_ACCOUNT,
    )

    expect(itemsA).toHaveLength(1)
    expect(itemsA[0].hash).toBe(TX_HASH)
    expect(itemsA[0].status).toBe("pending")
    expect(itemsB).toHaveLength(1)
    expect(itemsB[0].hash).toBe(TX_HASH_B)
    expect(itemsB[0].status).toBe("pending")
  })

  it("stale rejected operation does not clear the active operation guard", async () => {
    const operationA = createDeferred<Hash>()
    const operationB = createDeferred<Hash>()

    mutateAsync
      .mockImplementationOnce(() => operationA.promise)
      .mockImplementationOnce(() => operationB.promise)

    selection = readySelection(ACCOUNT)

    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(() => useSendEvmNative(), {
      wrapper: Wrapper,
    })

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.001" })
    })

    let confirmAPromise!: Promise<Hash>
    act(() => {
      confirmAPromise = result.current.confirmSend()
    })

    selection = readySelection(OTHER_ACCOUNT)
    rerender()

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.002" })
    })

    const confirmB = result.current.confirmSend
    let confirmBPromise!: Promise<Hash>
    act(() => {
      confirmBPromise = confirmB()
    })

    const staleWalletError = new BaseError("User rejected request", {
      cause: new UserRejectedRequestError(new Error("User denied")),
    })

    let staleError: unknown
    await act(async () => {
      operationA.reject(staleWalletError)
      try {
        await confirmAPromise
      } catch (cause) {
        staleError = cause
      }
    })

    expect(staleError).toMatchObject({ code: "TRANSACTION_REJECTED" })
    expect(result.current.error).toBeNull()

    await act(async () => {
      await expect(confirmB()).rejects.toMatchObject({
        code: "TRANSACTION_FAILED",
      })
    })

    expect(mutateAsync).toHaveBeenCalledTimes(2)

    await act(async () => {
      operationB.resolve(TX_HASH_B)
      await confirmBPromise
    })

    expect(result.current.hash).toBe(TX_HASH_B)
  })

  it("stale resolve after the new operation obtained a hash keeps the submitted guard", async () => {
    const operationA = createDeferred<Hash>()
    const operationB = createDeferred<Hash>()

    mutateAsync
      .mockImplementationOnce(() => operationA.promise)
      .mockImplementationOnce(() => operationB.promise)

    selection = readySelection(ACCOUNT)

    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(() => useSendEvmNative(), {
      wrapper: Wrapper,
    })

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.001" })
    })

    let confirmAPromise!: Promise<Hash>
    act(() => {
      confirmAPromise = result.current.confirmSend()
    })

    selection = readySelection(OTHER_ACCOUNT)
    rerender()

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.002" })
    })

    const confirmB = result.current.confirmSend
    let confirmBPromise!: Promise<Hash>
    act(() => {
      confirmBPromise = confirmB()
    })

    await act(async () => {
      operationB.resolve(TX_HASH_B)
      await confirmBPromise

      operationA.resolve(TX_HASH)
      await confirmAPromise

      // The stale callback still sees the submitted guard owned by B
      await expect(confirmB()).rejects.toMatchObject({
        code: "TRANSACTION_FAILED",
      })
    })

    expect(mutateAsync).toHaveBeenCalledTimes(2)
    expect(result.current.hash).toBe(TX_HASH_B)
  })
})
