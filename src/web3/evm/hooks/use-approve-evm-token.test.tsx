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
import { getBalanceQueryKey, readContractQueryKey } from "wagmi/query"

import { standardErc20Abi } from "@/web3/evm/abi/erc20"
import { getDefaultEvmNetwork } from "@/web3/evm/adapters/evm-registry.adapter"
import { EvmWeb3Error } from "@/web3/evm/errors"
import type { EvmSelection } from "@/web3/evm/selection/evm-selection"
import { useApproveEvmToken } from "@/web3/evm/hooks/use-approve-evm-token"
import { loadEvmTransactionHistory } from "@/web3/evm/storage/evm-transaction-history.storage"

const CHAIN_ID = 11155111
const ACCOUNT: Address = "0x086d9feCB2F117369fAbDB884eC6851b36595444"
const OTHER_ACCOUNT: Address = "0x1111111111111111111111111111111111111111"
const SPENDER: Address = "0x2222222222222222222222222222222222222222"
const OTHER_SPENDER: Address = "0x3333333333333333333333333333333333333333"
const USDC_SEPOLIA: Address = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
const TX_HASH: Hash =
  "0xbbbb1111222233334444555566667777888899990000aaaabbbbccccddddeeee"
const TX_HASH_B: Hash =
  "0xeeee1111222233334444555566667777888899990000aaaabbbbccccddddeeee"

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
  args?: readonly unknown[]
  query?: { enabled?: boolean }
}

let selection: EvmSelection = readySelection(ACCOUNT)
let receiptData: { status: "success" | "reverted" } | undefined
let receiptError: Error | null = null
let simulateData: { request: Record<string, unknown> } | undefined
let simulateError: unknown = null
let lastSimulateParams: SimulateParams = {}
const mutateAsync = vi.fn(async () => TX_HASH)
const wagmiReset = vi.fn()

vi.mock("wagmi", () => ({
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
    data: 45000n,
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

vi.mock("@/web3/evm/selection/use-evm-selection", () => ({
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
  simulateData = undefined
  simulateError = null
  mutateAsync.mockClear()
  wagmiReset.mockClear()
})

describe("useApproveEvmToken", () => {
  it("prepare creates a correct review and does not submit the transaction itself", () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(
      () =>
        useApproveEvmToken({
          tokenAddress: USDC_SEPOLIA,
          spenderAddress: SPENDER,
        }),
      { wrapper: Wrapper },
    )

    expect(result.current.review).toBeNull()

    act(() => {
      result.current.prepare({ amount: "100" })
    })

    expect(result.current.review).toEqual({
      action: "token-approval",
      chainId: CHAIN_ID,
      account: ACCOUNT,
      tokenAddress: USDC_SEPOLIA,
      spender: SPENDER,
      amount: "100",
      rawAmount: 100_000_000n,
      assetSymbol: "USDC",
      networkName: "Sepolia",
      isMainnet: false,
      isUnlimitedApproval: false,
    })

    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it("reset() deletes reviews and requests", () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(
      () =>
        useApproveEvmToken({
          tokenAddress: USDC_SEPOLIA,
          spenderAddress: SPENDER,
        }),
      { wrapper: Wrapper },
    )

    act(() => {
      result.current.prepare({ amount: "100" })
    })
    expect(result.current.review).not.toBeNull()

    act(() => {
      result.current.reset()
    })

    expect(result.current.review).toBeNull()
  })

  it("reset review and request when spender changes", () => {
    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      ({ spender }: { spender: Address }) =>
        useApproveEvmToken({
          tokenAddress: USDC_SEPOLIA,
          spenderAddress: spender,
        }),
      { wrapper: Wrapper, initialProps: { spender: SPENDER } },
    )

    act(() => {
      result.current.prepare({ amount: "100" })
    })
    expect(result.current.review).not.toBeNull()

    rerender({ spender: OTHER_SPENDER })

    expect(result.current.review).toBeNull()
  })

  it("reset review and hash when account changes", async () => {
    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      () =>
        useApproveEvmToken({
          tokenAddress: USDC_SEPOLIA,
          spenderAddress: SPENDER,
        }),
      { wrapper: Wrapper },
    )

    act(() => {
      result.current.prepare({ amount: "100" })
    })
    expect(result.current.review).not.toBeNull()

    selection = readySelection(OTHER_ACCOUNT)
    rerender()

    expect(result.current.review).toBeNull()
    expect(result.current.hash).toBeNull()
  })

  it("Pass the wallet account to useSimulateContract when simulation is enabled", () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(
      () =>
        useApproveEvmToken({
          tokenAddress: USDC_SEPOLIA,
          spenderAddress: SPENDER,
        }),
      { wrapper: Wrapper },
    )

    act(() => {
      result.current.prepare({ amount: "100" })
    })

    expect(lastSimulateParams.account).toBe(ACCOUNT)
  })

  it("prepare accepts amount 0 to revoke allowance", () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(
      () =>
        useApproveEvmToken({
          tokenAddress: USDC_SEPOLIA,
          spenderAddress: SPENDER,
        }),
      { wrapper: Wrapper },
    )

    let prepared: { args: readonly [Address, bigint] } | undefined
    act(() => {
      prepared = result.current.prepare({ amount: "0" })
    })

    expect(prepared?.args).toEqual([SPENDER, 0n])
  })

  it("confirmApprove throws EvmWeb3Error when simulation is not ready", async () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(
      () =>
        useApproveEvmToken({
          tokenAddress: USDC_SEPOLIA,
          spenderAddress: SPENDER,
        }),
      { wrapper: Wrapper },
    )

    await expect(result.current.confirmApprove()).rejects.toThrowError(
      EvmWeb3Error,
    )
  })

  it("notify simulation contract revert as SIMULATION_REVERTED without sending approval", () => {
    const reverted = new ContractFunctionRevertedError({
      abi: standardErc20Abi,
      functionName: "approve",
    })
    reverted.reason = "ERC20: approve to the zero address"
    simulateError = new BaseError("Contract call failed", { cause: reverted })

    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      () =>
        useApproveEvmToken({
          tokenAddress: USDC_SEPOLIA,
          spenderAddress: SPENDER,
        }),
      { wrapper: Wrapper },
    )

    act(() => {
      result.current.prepare({ amount: "100" })
    })
    rerender()

    expect(result.current.error).toMatchObject({
      code: "SIMULATION_REVERTED",
    })
    expect(result.current.status).toBe("error")
    expect(result.current.hash).toBeNull()
    expect(mutateAsync).not.toHaveBeenCalled()
    expect(
      loadEvmTransactionHistory().filter(
        (item) => item.chainId === CHAIN_ID && item.account === ACCOUNT,
      ),
    ).toHaveLength(0)
  })

  it("Do not report mined revert when approval write fails before returning hash", async () => {
    simulateData = { request: { address: USDC_SEPOLIA } }

    const reverted = new ContractFunctionRevertedError({
      abi: standardErc20Abi,
      functionName: "approve",
    })
    reverted.reason = "ERC20: approve to the zero address"
    mutateAsync.mockRejectedValueOnce(
      new BaseError("Write contract failed", { cause: reverted }),
    )

    const historyCountBefore = loadEvmTransactionHistory().length

    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      () =>
        useApproveEvmToken({
          tokenAddress: USDC_SEPOLIA,
          spenderAddress: SPENDER,
        }),
      { wrapper: Wrapper },
    )

    act(() => {
      result.current.prepare({ amount: "100" })
    })
    rerender()

    let caught: unknown
    await act(async () => {
      caught = await result.current.confirmApprove().catch((error) => error)
    })

    expect(caught).toMatchObject({ code: "TRANSACTION_FAILED" })
    expect(result.current.error).toMatchObject({ code: "TRANSACTION_FAILED" })
    expect(result.current.error?.message).toContain(
      "ERC20: approve to the zero address",
    )
    expect(result.current.status).toBe("error")
    expect(result.current.hash).toBeNull()
    expect(loadEvmTransactionHistory()).toHaveLength(historyCountBefore)
  })

  it("Allows re-preparation after simulation revert of approval", () => {
    const reverted = new ContractFunctionRevertedError({
      abi: standardErc20Abi,
      functionName: "approve",
    })
    simulateError = new BaseError("Contract call failed", { cause: reverted })

    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      () =>
        useApproveEvmToken({
          tokenAddress: USDC_SEPOLIA,
          spenderAddress: SPENDER,
        }),
      { wrapper: Wrapper },
    )

    act(() => {
      result.current.prepare({ amount: "100" })
    })
    rerender()
    expect(result.current.status).toBe("error")

    simulateError = null
    simulateData = { request: { to: USDC_SEPOLIA } }

    act(() => {
      result.current.prepare({ amount: "50" })
    })
    rerender()

    expect(result.current.error).toBeNull()
    expect(result.current.status).toBe("ready")
  })

  it("invalidate the token allowance exactly once upon receipt success", async () => {
    const { Wrapper, invalidateSpy } = createWrapper()
    const { result, rerender } = renderHook(
      () =>
        useApproveEvmToken({
          tokenAddress: USDC_SEPOLIA,
          spenderAddress: SPENDER,
        }),
      { wrapper: Wrapper },
    )

    act(() => {
      result.current.prepare({ amount: "100" })
    })

    simulateData = { request: { address: USDC_SEPOLIA } }
    rerender()

    await act(async () => {
      await result.current.confirmApprove()
    })
    expect(result.current.hash).toBe(TX_HASH)
    expect(invalidateSpy).not.toHaveBeenCalled()

    receiptData = { status: "success" }
    rerender()

    await waitFor(() => expect(invalidateSpy).toHaveBeenCalled())
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: readContractQueryKey({
        address: USDC_SEPOLIA,
        abi: standardErc20Abi,
        functionName: "allowance",
        chainId: CHAIN_ID,
      }),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getBalanceQueryKey({ address: ACCOUNT, chainId: CHAIN_ID }),
    })
  })

  it("double confirm does not send the approval token twice", async () => {
    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      () => useApproveEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }

    act(() => result.current.prepare({ spender: SPENDER, amount: "100.0" }))
    rerender()

    mutateAsync.mockClear()

    await act(async () => {
      const [, second] = await Promise.allSettled([
        result.current.confirmApprove(),
        result.current.confirmApprove(),
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

  it("Block prepare() when the transaction approval token is active", async () => {
    let resolveTx: (hash: Hash) => void = () => {}
    mutateAsync.mockImplementationOnce(
      () =>
        new Promise<Hash>((resolve) => {
          resolveTx = resolve
        }),
    )

    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      () => useApproveEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }
    act(() => result.current.prepare({ spender: SPENDER, amount: "100.0" }))
    rerender()

    let confirmPromise: Promise<Hash>
    act(() => {
      confirmPromise = result.current.confirmApprove()
    })

    expect(() => {
      result.current.prepare({ spender: SPENDER, amount: "200.0" })
    }).toThrow("Cannot replace or reset an active transaction.")

    await act(async () => {
      resolveTx(TX_HASH)
      await confirmPromise
    })
  })

  it("Block reset() when transaction approval token is active", async () => {
    let resolveTx: (hash: Hash) => void = () => {}
    mutateAsync.mockImplementationOnce(
      () =>
        new Promise<Hash>((resolve) => {
          resolveTx = resolve
        }),
    )

    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      () => useApproveEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }
    act(() => result.current.prepare({ spender: SPENDER, amount: "100.0" }))
    rerender()

    let confirmPromise: Promise<Hash>
    act(() => {
      confirmPromise = result.current.confirmApprove()
    })

    expect(() => {
      result.current.reset()
    }).toThrow("Cannot replace or reset an active transaction.")

    await act(async () => {
      resolveTx(TX_HASH)
      await confirmPromise
    })
  })

  it("Allow reset() and prepare() new transactions after receipt reaches terminal status (success or reverted)", async () => {
    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      () =>
        useApproveEvmToken({
          tokenAddress: USDC_SEPOLIA,
          spenderAddress: SPENDER,
        }),
      { wrapper: Wrapper },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }

    // 1. Prepare & confirm first transaction
    act(() => result.current.prepare({ amount: "100.0" }))
    rerender()
    await act(async () => {
      await result.current.confirmApprove()
    })

    // Receipt success
    receiptData = { status: "success" }
    rerender()

    // reset() works after success
    act(() => result.current.reset())
    expect(result.current.review).toBeNull()

    // prepare() next transaction works after success
    act(() => result.current.prepare({ amount: "200.0" }))
    expect(result.current.review?.amount).toBe("200")

    // Confirm second transaction
    await act(async () => {
      await result.current.confirmApprove()
    })

    // Receipt reverted
    receiptData = { status: "reverted" }
    rerender()

    // reset() works after reverted
    act(() => result.current.reset())
    expect(result.current.review).toBeNull()

    // prepare() next transaction works after reverted
    act(() => result.current.prepare({ amount: "300.0" }))
    expect(result.current.review?.amount).toBe("300")
  })

  it("Block reset() and prepare() when the hash is available but the receipt is pending", async () => {
    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      () =>
        useApproveEvmToken({
          tokenAddress: USDC_SEPOLIA,
          spenderAddress: SPENDER,
        }),
      { wrapper: Wrapper },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }
    act(() => result.current.prepare({ amount: "100.0" }))
    rerender()

    await act(async () => {
      await result.current.confirmApprove()
    })

    // Receipt is pending (undefined status)
    receiptData = undefined
    rerender()

    expect(() => {
      result.current.reset()
    }).toThrow("Cannot replace or reset an active transaction.")

    expect(() => {
      result.current.prepare({ amount: "200.0" })
    }).toThrow("Cannot replace or reset an active transaction.")
  })

  it("callback and invalidation only run once when the callback reference changes or the component rerender", async () => {
    const { Wrapper, invalidateSpy } = createWrapper()
    const calls: string[] = []

    const { result, rerender } = renderHook(
      ({ tag }: { tag: string }) =>
        useApproveEvmToken({
          tokenAddress: USDC_SEPOLIA,
          spenderAddress: SPENDER,
          onReceiptSuccess: () => calls.push(tag),
        }),
      { wrapper: Wrapper, initialProps: { tag: "initial" } },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }
    act(() => result.current.prepare({ amount: "100.0" }))
    rerender({ tag: "initial" })

    await act(async () => {
      await result.current.confirmApprove()
    })

    receiptData = { status: "success" }
    rerender({ tag: "initial" })

    await waitFor(() => expect(calls).toHaveLength(1))
    expect(invalidateSpy).toHaveBeenCalled()
    const initialCallCount = invalidateSpy.mock.calls.length

    // Rerender with different callback reference
    rerender({ tag: "updated" })

    expect(calls).toEqual(["initial"])
    expect(invalidateSpy.mock.calls.length).toBe(initialCallCount)
  })

  it("Changing selection before mutateAsync resolve still saves transaction history for the old account", async () => {
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
    const { result, rerender } = renderHook(
      () =>
        useApproveEvmToken({
          tokenAddress: USDC_SEPOLIA,
          spenderAddress: SPENDER,
        }),
      { wrapper: Wrapper },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }
    act(() => result.current.prepare({ amount: "100.0" }))
    rerender()

    let confirmPromise: Promise<Hash>
    act(() => {
      confirmPromise = result.current.confirmApprove()
    })

    // Account changes while wallet modal was open
    currentAccount = OTHER_ACCOUNT
    selection = readySelection(currentAccount)
    rerender()

    await act(async () => {
      resolveTx(TX_HASH)
      await confirmPromise
    })

    // Hash not bound to new selection
    expect(result.current.hash).toBeNull()

    // History item saved for original account
    const items = loadEvmTransactionHistory().filter(
      (item) => item.chainId === CHAIN_ID && item.account === ACCOUNT,
    )
    expect(items).toHaveLength(1)
    expect(items[0].hash).toBe(TX_HASH)
    expect(items[0].action).toBe("token-approval")
  })

  it("Allows reset/stopTrackingReceipt/prepare when receipt has RPC error/timeout while still keeping pending history", async () => {
    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      () =>
        useApproveEvmToken({
          tokenAddress: USDC_SEPOLIA,
          spenderAddress: SPENDER,
        }),
      { wrapper: Wrapper },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }
    act(() => result.current.prepare({ amount: "100.0" }))
    rerender()

    await act(async () => {
      await result.current.confirmApprove()
    })

    expect(result.current.hash).toBe(TX_HASH)

    // RPC Error during receipt fetching
    receiptData = undefined
    receiptError = new Error("RPC error")
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

    // History item stays pending
    const items = loadEvmTransactionHistory().filter(
      (item) => item.chainId === CHAIN_ID && item.account === ACCOUNT,
    )
    expect(items).toHaveLength(1)
    expect(items[0].hash).toBe(TX_HASH)
    expect(items[0].status).toBe("pending")

    // Preparing a new approval transaction succeeds after stopTrackingReceipt
    act(() => {
      result.current.prepare({ amount: "200.0" })
    })
    expect(result.current.review?.amount).toBe("200")

    // Confirming new approval transaction works
    mutateAsync.mockClear()
    await act(async () => {
      await result.current.confirmApprove()
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
    const { result, rerender } = renderHook(
      () =>
        useApproveEvmToken({
          tokenAddress: USDC_SEPOLIA,
          spenderAddress: SPENDER,
        }),
      { wrapper: Wrapper },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }
    act(() => result.current.prepare({ amount: "100.0" }))
    rerender()

    let confirmPromise: Promise<Hash>
    act(() => {
      confirmPromise = result.current.confirmApprove()
    })

    // User switches account while prompt open
    currentAccount = OTHER_ACCOUNT
    selection = readySelection(currentAccount)
    rerender()

    const walletErr = new BaseError("User rejected", {
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

    expect(thrownError).toBeInstanceOf(EvmWeb3Error)
    expect((thrownError as EvmWeb3Error).code).toBe("TRANSACTION_REJECTED")

    expect(result.current.error).toBeNull()
  })

  it("blocks sequential confirm calls from the same render callback", async () => {
    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      () =>
        useApproveEvmToken({
          tokenAddress: USDC_SEPOLIA,
          spenderAddress: SPENDER,
        }),
      { wrapper: Wrapper },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }

    act(() => {
      result.current.prepare({
        amount: "100.0",
      })
    })
    rerender()

    const confirmFromPreparedRender = result.current.confirmApprove

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
    const { result, rerender } = renderHook(
      () =>
        useApproveEvmToken({
          tokenAddress: USDC_SEPOLIA,
          spenderAddress: SPENDER,
        }),
      { wrapper: Wrapper },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }
    act(() => {
      result.current.prepare({ amount: "100.0" })
    })
    rerender()

    let confirmPromise: Promise<Hash>
    act(() => {
      confirmPromise = result.current.confirmApprove()
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
      result.current.prepare({ amount: "200.0" })
    })
    rerender()
    expect(result.current.review?.amount).toBe("200")

    mutateAsync.mockClear()
    await act(async () => {
      await result.current.confirmApprove()
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
    const { result, rerender } = renderHook(
      () =>
        useApproveEvmToken({
          tokenAddress: USDC_SEPOLIA,
          spenderAddress: SPENDER,
        }),
      { wrapper: Wrapper },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }
    act(() => {
      result.current.prepare({ amount: "100.0" })
    })
    rerender()

    await act(async () => {
      await expect(result.current.confirmApprove()).rejects.toThrow()
    })

    expect(result.current.status).toBe("rejected")

    act(() => {
      result.current.prepare({ amount: "100.0" })
    })
    rerender()

    mutateAsync.mockResolvedValueOnce(TX_HASH)
    await act(async () => {
      await result.current.confirmApprove()
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
    const { result, rerender } = renderHook(
      () =>
        useApproveEvmToken({
          tokenAddress: USDC_SEPOLIA,
          spenderAddress: SPENDER,
        }),
      { wrapper: Wrapper },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }
    act(() => {
      result.current.prepare({ amount: "100" })
    })
    rerender()

    let confirmAPromise!: Promise<Hash>
    act(() => {
      confirmAPromise = result.current.confirmApprove()
    })

    selection = readySelection(OTHER_ACCOUNT)
    rerender()

    act(() => {
      result.current.prepare({ amount: "200" })
    })
    rerender()

    const confirmB = result.current.confirmApprove
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
    const { result, rerender } = renderHook(
      () =>
        useApproveEvmToken({
          tokenAddress: USDC_SEPOLIA,
          spenderAddress: SPENDER,
        }),
      { wrapper: Wrapper },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }
    act(() => {
      result.current.prepare({ amount: "100" })
    })
    rerender()

    let confirmAPromise!: Promise<Hash>
    act(() => {
      confirmAPromise = result.current.confirmApprove()
    })

    selection = readySelection(OTHER_ACCOUNT)
    rerender()

    act(() => {
      result.current.prepare({ amount: "200" })
    })
    rerender()

    const confirmB = result.current.confirmApprove
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
    const { result, rerender } = renderHook(
      () =>
        useApproveEvmToken({
          tokenAddress: USDC_SEPOLIA,
          spenderAddress: SPENDER,
        }),
      { wrapper: Wrapper },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }
    act(() => {
      result.current.prepare({ amount: "100" })
    })
    rerender()

    let confirmAPromise!: Promise<Hash>
    act(() => {
      confirmAPromise = result.current.confirmApprove()
    })

    selection = readySelection(OTHER_ACCOUNT)
    rerender()

    act(() => {
      result.current.prepare({ amount: "200" })
    })
    rerender()

    const confirmB = result.current.confirmApprove
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
