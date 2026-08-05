import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import {
  BaseError,
  ContractFunctionRevertedError,
  UserRejectedRequestError,
} from "viem"
import type { Address, Hash } from "viem"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { getBalanceQueryKey, readContractQueryKey } from "wagmi/query"

import { standardErc20Abi } from "@/web3/evm/abi/erc20"
import { getDefaultEvmNetwork } from "@/web3/evm/chain/registry/evm-registry.adapter"
import { EvmWeb3Error } from "@/web3/evm/errors/evm-errors"
import type { EvmSelection } from "@/web3/evm/chain/selection/evm-selection"
import { useSendEvmToken } from "@/web3/evm/hooks/use-send-evm-token"
import { loadEvmTransactionHistory } from "@/web3/evm/storage/evm-transaction-history.storage"

const CHAIN_ID = 11155111
const ACCOUNT: Address = "0x086d9feCB2F117369fAbDB884eC6851b36595444"
const OTHER_ACCOUNT: Address = "0x1111111111111111111111111111111111111111"
const RECIPIENT: Address = "0x2222222222222222222222222222222222222222"
const USDC_SEPOLIA: Address = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
const TX_HASH: Hash =
  "0xcccc1111222233334444555566667777888899990000aaaabbbbccccddddeeee"
const TX_HASH_B: Hash =
  "0xdddd1111222233334444555566667777888899990000aaaabbbbccccddddeeee"

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

let selection: EvmSelection = readySelection(ACCOUNT)
let receiptData: { status: "success" | "reverted" } | undefined
let receiptError: Error | null = null
let simulateData: { request: Record<string, unknown> } | undefined
let simulateError: unknown = null
let writeError: unknown
const mutateAsync = vi.fn(async () => {
  if (writeError) throw writeError
  return TX_HASH
})

const simulateSpy = vi.fn()

vi.mock("wagmi", () => ({
  useSimulateContract: (config: unknown) => {
    simulateSpy(config)
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
    reset: vi.fn(),
  }),
  useWaitForTransactionReceipt: () => ({
    data: receiptData,
    isLoading: false,
    error: receiptError,
  }),
  useEstimateGas: () => ({
    data: 50000n,
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

vi.mock("@/web3/evm/chain/selection/use-evm-selection", () => ({
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
  writeError = undefined
  mutateAsync.mockClear()
  simulateSpy.mockClear()
})

describe("useSendEvmToken", () => {
  it("prepare creates a correct review and does not submit the transaction itself", () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(
      () => useSendEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    expect(result.current.review).toBeNull()

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "1.5" })
    })

    expect(result.current.review).toEqual({
      action: "token-transfer",
      chainId: CHAIN_ID,
      account: ACCOUNT,
      tokenAddress: USDC_SEPOLIA,
      recipient: RECIPIENT,
      amount: "1.5",
      rawAmount: 1_500_000n,
      assetSymbol: "USDC",
      networkName: "Sepolia",
      isMainnet: false,
    })

    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it("reset() deletes reviews and requests", () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(
      () => useSendEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "1.5" })
    })
    expect(result.current.review).not.toBeNull()

    act(() => {
      result.current.reset()
    })

    expect(result.current.review).toBeNull()
  })

  it("reset review when account changes", () => {
    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      () => useSendEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "1.5" })
    })
    expect(result.current.review).not.toBeNull()

    selection = readySelection(OTHER_ACCOUNT)
    rerender()

    expect(result.current.review).toBeNull()
  })

  it("Pass the wallet account to useSimulateContract when simulation is enabled", () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(
      () => useSendEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "1.5" })
    })

    expect(simulateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        account: ACCOUNT,
        chainId: CHAIN_ID,
      }),
    )
  })

  it("prepare uses token decimals from the registry", () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(
      () => useSendEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    let prepared: { args: readonly [Address, bigint] } | undefined
    act(() => {
      prepared = result.current.prepare({ to: RECIPIENT, amount: "1.5" })
    })

    expect(prepared?.args).toEqual([RECIPIENT, 1_500_000n])
  })

  it("prepare throws EvmWeb3Error when recipient is in wrong format", () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(
      () => useSendEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    expect(() =>
      result.current.prepare({ to: "0xnope", amount: "1" }),
    ).toThrowError(EvmWeb3Error)
  })

  it("prepare throws TOKEN_NOT_CONFIGURED when the token does not exist in the registry", () => {
    const { Wrapper } = createWrapper()
    const unknownToken: Address = "0x9999999999999999999999999999999999999999"
    const { result } = renderHook(
      () => useSendEvmToken({ tokenAddress: unknownToken }),
      { wrapper: Wrapper },
    )

    try {
      result.current.prepare({ to: RECIPIENT, amount: "1" })
      expect.fail("Expected prepare to throw")
    } catch (error) {
      expect(error).toBeInstanceOf(EvmWeb3Error)
      expect((error as EvmWeb3Error).code).toBe("TOKEN_NOT_CONFIGURED")
    }
  })

  it("throws EvmWeb3Error code SIMULATION_FAILED when confirmSend is called before simulation success", async () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(
      () => useSendEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "1.5" })
    })

    await expect(result.current.confirmSend()).rejects.toThrowError(
      EvmWeb3Error,
    )
  })

  it("notify simulation contract revert as SIMULATION_REVERTED without sending transaction", () => {
    const reverted = new ContractFunctionRevertedError({
      abi: standardErc20Abi,
      functionName: "transfer",
    })
    reverted.reason = "ERC20: transfer amount exceeds balance"
    simulateError = new BaseError("Contract call failed", { cause: reverted })

    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      () => useSendEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "1" })
    })
    rerender()

    expect(result.current.error).toMatchObject({
      code: "SIMULATION_REVERTED",
    })
    expect(result.current.error?.message).toContain(
      "ERC20: transfer amount exceeds balance",
    )
    expect(result.current.status).toBe("error")
    expect(result.current.hash).toBeNull()
    expect(mutateAsync).not.toHaveBeenCalled()
    expect(
      loadEvmTransactionHistory().filter(
        (item) => item.chainId === CHAIN_ID && item.account === ACCOUNT,
      ),
    ).toHaveLength(0)
  })

  it("Do not report mined revert when writeContract fails before returning the hash", async () => {
    simulateData = { request: { address: USDC_SEPOLIA } }

    const reverted = new ContractFunctionRevertedError({
      abi: standardErc20Abi,
      functionName: "transfer",
    })
    reverted.reason = "ERC20: transfer amount exceeds balance"
    writeError = new BaseError("Write contract failed", { cause: reverted })

    const historyCountBefore = loadEvmTransactionHistory().length

    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      () => useSendEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "1" })
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

  it("Allows retry after submission fails due to contract error", async () => {
    simulateData = { request: { address: USDC_SEPOLIA } }

    const reverted = new ContractFunctionRevertedError({
      abi: standardErc20Abi,
      functionName: "transfer",
    })
    writeError = new BaseError("Write contract failed", { cause: reverted })

    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      () => useSendEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "1" })
    })
    rerender()

    await act(async () => {
      await expect(result.current.confirmSend()).rejects.toMatchObject({
        code: "TRANSACTION_FAILED",
      })
    })
    expect(result.current.status).toBe("error")

    // Submission failure cannot block submissionInFlightRef/submittedHashRef
    writeError = undefined

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "0.5" })
    })
    rerender()

    await act(async () => {
      await result.current.confirmSend()
    })

    expect(result.current.hash).toBe(TX_HASH)
    expect(mutateAsync).toHaveBeenCalledTimes(2)
  })

  it("Allows you to prepare again after simulation revert and return to ready when simulation is successful", () => {
    const reverted = new ContractFunctionRevertedError({
      abi: standardErc20Abi,
      functionName: "transfer",
    })
    simulateError = new BaseError("Contract call failed", { cause: reverted })

    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      () => useSendEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "1000" })
    })
    rerender()
    expect(result.current.status).toBe("error")

    // Edit amount then prepare again: simulation revert cannot lock the hook
    simulateError = null
    simulateData = { request: { to: USDC_SEPOLIA } }

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "1" })
    })
    rerender()

    expect(result.current.error).toBeNull()
    expect(result.current.status).toBe("ready")
    expect(result.current.canSend).toBe(true)
  })

  it("change wallet rejection to TRANSACTION_REJECTED", async () => {
    writeError = new BaseError("Failed to send transaction.", {
      cause: new UserRejectedRequestError(new Error("User denied")),
    })

    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      () => useSendEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "1" })
    })
    simulateData = { request: { address: USDC_SEPOLIA } }
    rerender()

    let caught: unknown
    await act(async () => {
      caught = await result.current.confirmSend().catch((error) => error)
    })

    expect(caught).toBeInstanceOf(EvmWeb3Error)
    expect((caught as EvmWeb3Error).code).toBe("TRANSACTION_REJECTED")
    expect(result.current.hash).toBeNull()
  })

  it("invalidate balanceOf of the token after receipt success, exactly once", async () => {
    const { Wrapper, invalidateSpy } = createWrapper()
    const { result, rerender } = renderHook(
      () => useSendEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "1" })
    })
    simulateData = { request: { address: USDC_SEPOLIA } }
    rerender()

    await act(async () => {
      await result.current.confirmSend()
    })
    expect(result.current.hash).toBe(TX_HASH)

    receiptData = { status: "success" }
    rerender()

    await waitFor(() => expect(invalidateSpy).toHaveBeenCalled())
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: readContractQueryKey({
        address: USDC_SEPOLIA,
        abi: standardErc20Abi,
        functionName: "balanceOf",
        chainId: CHAIN_ID,
      }),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getBalanceQueryKey({ address: ACCOUNT, chainId: CHAIN_ID }),
    })
  })

  it("double confirm does not send the transfer token twice", async () => {
    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      () => useSendEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }

    act(() => result.current.prepare({ to: RECIPIENT, amount: "1.0" }))
    rerender()

    mutateAsync.mockClear()

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

  it("Block prepare() when token transfer transaction is active", async () => {
    let resolveTx: (hash: Hash) => void = () => {}
    mutateAsync.mockImplementationOnce(
      () =>
        new Promise<Hash>((resolve) => {
          resolveTx = resolve
        }),
    )

    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      () => useSendEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }
    act(() => result.current.prepare({ to: RECIPIENT, amount: "1.0" }))
    rerender()

    let confirmPromise: Promise<Hash>
    act(() => {
      confirmPromise = result.current.confirmSend()
    })

    expect(() => {
      result.current.prepare({ to: RECIPIENT, amount: "2.0" })
    }).toThrow("Cannot replace or reset an active transaction.")

    await act(async () => {
      resolveTx(TX_HASH)
      await confirmPromise
    })
  })

  it("Block reset() when token transfer transaction is active", async () => {
    let resolveTx: (hash: Hash) => void = () => {}
    mutateAsync.mockImplementationOnce(
      () =>
        new Promise<Hash>((resolve) => {
          resolveTx = resolve
        }),
    )

    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      () => useSendEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }
    act(() => result.current.prepare({ to: RECIPIENT, amount: "1.0" }))
    rerender()

    let confirmPromise: Promise<Hash>
    act(() => {
      confirmPromise = result.current.confirmSend()
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
      () => useSendEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }

    // 1. Prepare & confirm first transaction
    act(() => result.current.prepare({ to: RECIPIENT, amount: "1.0" }))
    rerender()
    await act(async () => {
      await result.current.confirmSend()
    })

    // Receipt success
    receiptData = { status: "success" }
    rerender()

    // reset() works after success
    act(() => result.current.reset())
    expect(result.current.review).toBeNull()

    // prepare() next transaction works after success
    act(() => result.current.prepare({ to: RECIPIENT, amount: "2.0" }))
    expect(result.current.review?.amount).toBe("2")

    // Confirm second transaction
    await act(async () => {
      await result.current.confirmSend()
    })

    // Receipt reverted
    receiptData = { status: "reverted" }
    rerender()

    // reset() works after reverted
    act(() => result.current.reset())
    expect(result.current.review).toBeNull()

    // prepare() next transaction works after reverted
    act(() => result.current.prepare({ to: RECIPIENT, amount: "3.0" }))
    expect(result.current.review?.amount).toBe("3")
  })

  it("Block reset() and prepare() when the hash is available but the receipt is pending", async () => {
    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      () => useSendEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }
    act(() => result.current.prepare({ to: RECIPIENT, amount: "1.0" }))
    rerender()

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
      result.current.prepare({ to: RECIPIENT, amount: "2.0" })
    }).toThrow("Cannot replace or reset an active transaction.")
  })

  it("callback and invalidation only run once when the callback reference changes or the component rerender", async () => {
    const { Wrapper, invalidateSpy } = createWrapper()
    const calls: string[] = []

    const { result, rerender } = renderHook(
      ({ tag }: { tag: string }) =>
        useSendEvmToken({
          tokenAddress: USDC_SEPOLIA,
          onReceiptSuccess: () => calls.push(tag),
        }),
      { wrapper: Wrapper, initialProps: { tag: "initial" } },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }
    act(() => result.current.prepare({ to: RECIPIENT, amount: "1.0" }))
    rerender({ tag: "initial" })

    await act(async () => {
      await result.current.confirmSend()
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
      () => useSendEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }
    act(() => result.current.prepare({ to: RECIPIENT, amount: "1.0" }))
    rerender()

    let confirmPromise: Promise<Hash>
    act(() => {
      confirmPromise = result.current.confirmSend()
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
    expect(items[0].action).toBe("token-transfer")
  })

  it("Allows reset/stopTrackingReceipt/prepare when receipt has RPC error/timeout while still keeping pending history", async () => {
    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      () => useSendEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }
    act(() => result.current.prepare({ to: RECIPIENT, amount: "1.0" }))
    rerender()

    await act(async () => {
      await result.current.confirmSend()
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

    // Preparing a new token transaction succeeds after stopTrackingReceipt
    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "2.0" })
    })
    expect(result.current.review?.amount).toBe("2")

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
    const { result, rerender } = renderHook(
      () => useSendEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }
    act(() => result.current.prepare({ to: RECIPIENT, amount: "1.0" }))
    rerender()

    let confirmPromise: Promise<Hash>
    act(() => {
      confirmPromise = result.current.confirmSend()
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
      () => useSendEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }

    act(() => {
      result.current.prepare({
        to: RECIPIENT,
        amount: "1.0",
      })
    })
    rerender()

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
    const { result, rerender } = renderHook(
      () => useSendEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }
    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "1.0" })
    })
    rerender()

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
      result.current.prepare({ to: RECIPIENT, amount: "2.0" })
    })
    rerender()
    expect(result.current.review?.amount).toBe("2")

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
    const { result, rerender } = renderHook(
      () => useSendEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }
    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "1.0" })
    })
    rerender()

    await act(async () => {
      await expect(result.current.confirmSend()).rejects.toThrow()
    })

    expect(result.current.status).toBe("rejected")

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "1.0" })
    })
    rerender()

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
    const { result, rerender } = renderHook(
      () => useSendEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }
    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "1.0" })
    })
    rerender()

    let confirmAPromise!: Promise<Hash>
    act(() => {
      confirmAPromise = result.current.confirmSend()
    })

    selection = readySelection(OTHER_ACCOUNT)
    rerender()

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "2.0" })
    })
    rerender()

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
    const { result, rerender } = renderHook(
      () => useSendEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }
    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "1.0" })
    })
    rerender()

    let confirmAPromise!: Promise<Hash>
    act(() => {
      confirmAPromise = result.current.confirmSend()
    })

    selection = readySelection(OTHER_ACCOUNT)
    rerender()

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "2.0" })
    })
    rerender()

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
    const { result, rerender } = renderHook(
      () => useSendEvmToken({ tokenAddress: USDC_SEPOLIA }),
      { wrapper: Wrapper },
    )

    simulateData = { request: { address: USDC_SEPOLIA } }
    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "1.0" })
    })
    rerender()

    let confirmAPromise!: Promise<Hash>
    act(() => {
      confirmAPromise = result.current.confirmSend()
    })

    selection = readySelection(OTHER_ACCOUNT)
    rerender()

    act(() => {
      result.current.prepare({ to: RECIPIENT, amount: "2.0" })
    })
    rerender()

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
