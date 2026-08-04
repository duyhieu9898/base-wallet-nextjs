import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import type { Address } from "viem"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { standardErc20Abi } from "@/web3/evm/abi/erc20"
import { getDefaultEvmNetwork } from "@/web3/evm/adapters/evm-registry.adapter"
import { EvmWeb3Error } from "@/web3/evm/errors"

import {
  useEvmFeeEstimate,
  type EvmFeeEstimateTarget,
} from "@/web3/evm/hooks/use-evm-fee-estimate"
import type { EvmSelection } from "@/web3/evm/selection/evm-selection"

const CHAIN_ID = 11155111
const ACCOUNT: Address = "0x086d9feCB2F117369fAbDB884eC6851b36595444"
const RECIPIENT: Address = "0x2222222222222222222222222222222222222222"
const USDC_SEPOLIA: Address = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"

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
let gasLimitResult: bigint | undefined = 21_000n
let gasFeesResult: { gasPrice?: bigint; maxFeePerGas?: bigint } | undefined = {
  maxFeePerGas: 20_000_000_000n, // 20 gwei
  gasPrice: 15_000_000_000n,
}
let estimateGasError: Error | null = null
let estimateFeesError: Error | null = null

const estimateGasSpy = vi.fn()
const estimateFeesSpy = vi.fn()

vi.mock("wagmi", () => ({
  useEstimateGas: (config: unknown) => {
    estimateGasSpy(config)
    return {
      data: estimateGasError ? undefined : gasLimitResult,
      isPending: false,
      isSuccess: !estimateGasError && gasLimitResult !== undefined,
      error: estimateGasError,
    }
  },
  useEstimateFeesPerGas: (config: unknown) => {
    estimateFeesSpy(config)
    return {
      data: estimateFeesError ? undefined : gasFeesResult,
      isPending: false,
      isSuccess: !estimateFeesError && gasFeesResult !== undefined,
      error: estimateFeesError,
    }
  },
}))

vi.mock("@/web3/evm/selection/use-evm-selection", () => ({
  useEvmSelection: () => selection,
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
  return { Wrapper }
}

beforeEach(() => {
  selection = readySelection
  gasLimitResult = 21_000n
  gasFeesResult = {
    maxFeePerGas: 20_000_000_000n,
    gasPrice: 15_000_000_000n,
  }
  estimateGasError = null
  estimateFeesError = null
  estimateGasSpy.mockClear()
  estimateFeesSpy.mockClear()
})

describe("useEvmFeeEstimate", () => {
  it("Returns idle status when selection is not ready or target is null", () => {
    selection = {
      status: "disconnected",
      account: null,
      walletChainId: null,
      chainId: CHAIN_ID,
      network,
      networks: [network],
    }
    const { Wrapper } = createWrapper()
    const { result } = renderHook(
      () =>
        useEvmFeeEstimate({
          kind: "native-transfer",
          prepared: { to: RECIPIENT, value: 1000n },
        }),
      { wrapper: Wrapper },
    )

    expect(result.current.status).toBe("idle")
    expect(result.current.estimatedFee).toBeNull()
  })

  it("bind the correct account and chainId when estimating native transfer", () => {
    const { Wrapper } = createWrapper()
    renderHook(
      () =>
        useEvmFeeEstimate({
          kind: "native-transfer",
          prepared: { to: RECIPIENT, value: 1_000_000_000_000_000n },
        }),
      { wrapper: Wrapper },
    )

    expect(estimateGasSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        account: ACCOUNT,
        chainId: CHAIN_ID,
        to: RECIPIENT,
        value: 1_000_000_000_000_000n,
      }),
    )
    expect(estimateFeesSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        chainId: CHAIN_ID,
      }),
    )
  })

  it("bind the correct contract request when estimating token transfer", () => {
    const { Wrapper } = createWrapper()
    renderHook(
      () =>
        useEvmFeeEstimate({
          kind: "token-transfer",
          prepared: {
            address: USDC_SEPOLIA,
            abi: standardErc20Abi,
            functionName: "transfer",
            args: [RECIPIENT, 1_000_000n],
          },
        }),
      { wrapper: Wrapper },
    )

    expect(estimateGasSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        account: ACCOUNT,
        chainId: CHAIN_ID,
        to: USDC_SEPOLIA,
        data: expect.any(String),
      }),
    )
  })

  it("calculate estimatedFee = gasLimit * maxFeePerGas and format ether on success", () => {
    gasLimitResult = 50_000n
    gasFeesResult = { maxFeePerGas: 20_000_000_000n } // 20 gwei

    const { Wrapper } = createWrapper()
    const { result } = renderHook(
      () =>
        useEvmFeeEstimate({
          kind: "native-transfer",
          prepared: { to: RECIPIENT, value: 1_000_000_000_000_000n },
        }),
      { wrapper: Wrapper },
    )

    expect(result.current.status).toBe("success")
    expect(result.current.gasLimit).toBe(50_000n)
    expect(result.current.estimatedFee).toBe(1_000_000_000_000_000n) // 50000 * 20gwei = 0.001 ETH
    expect(result.current.formattedFee).toBe("0.001")
    expect(result.current.nativeSymbol).toBe("ETH")
    expect(result.current.error).toBeNull()
  })

  it("normalize RPC errors to EvmWeb3Error SIMULATION_FAILED when gas estimate fails", () => {
    estimateGasError = new Error("Execution reverted during gas estimation")

    const { Wrapper } = createWrapper()
    const { result } = renderHook(
      () =>
        useEvmFeeEstimate({
          kind: "native-transfer",
          prepared: { to: RECIPIENT, value: 1_000_000_000_000_000n },
        }),
      { wrapper: Wrapper },
    )

    expect(result.current.status).toBe("error")
    expect(result.current.error).toBeInstanceOf(EvmWeb3Error)
    expect(result.current.error?.code).toBe("SIMULATION_FAILED")
  })

  it("normalize RPC errors to EvmWeb3Error RPC_REQUEST_FAILED when fee estimate fails", () => {
    estimateFeesError = new Error("Fee data fetch failed")

    const { Wrapper } = createWrapper()
    const { result } = renderHook(
      () =>
        useEvmFeeEstimate({
          kind: "native-transfer",
          prepared: { to: RECIPIENT, value: 1_000_000_000_000_000n },
        }),
      { wrapper: Wrapper },
    )

    expect(result.current.status).toBe("error")
    expect(result.current.error).toBeInstanceOf(EvmWeb3Error)
    expect(result.current.error?.code).toBe("RPC_REQUEST_FAILED")
  })

  it("Returns estimated status when gasLimit is available but fee details are missing", () => {
    gasLimitResult = 21_000n
    gasFeesResult = undefined // missing fees

    const { Wrapper } = createWrapper()
    const { result } = renderHook(
      () =>
        useEvmFeeEstimate({
          kind: "native-transfer",
          prepared: { to: RECIPIENT, value: 1_000_000_000_000_000n },
        }),
      { wrapper: Wrapper },
    )

    expect(result.current.status).toBe("estimating")
    expect(result.current.estimatedFee).toBeNull()
  })

  it("map encode calldata failed to EvmWeb3Error code SIMULATION_FAILED", () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(
      () =>
        useEvmFeeEstimate({
          kind: "token-transfer",
          prepared: {
            address: USDC_SEPOLIA,
            abi: standardErc20Abi,
            functionName: "transfer",
            args: [RECIPIENT, "not-a-number" as unknown as bigint], // will throw during encoding
          },
        }),
      { wrapper: Wrapper },
    )

    expect(result.current.status).toBe("error")
    expect(result.current.error).toBeInstanceOf(EvmWeb3Error)
    expect(result.current.error?.code).toBe("SIMULATION_FAILED")
  })

  it("refetch/reset when target request changes", () => {
    const { Wrapper } = createWrapper()
    const { rerender } = renderHook(
      (target: EvmFeeEstimateTarget | null) => useEvmFeeEstimate(target),
      {
        wrapper: Wrapper,
        initialProps: {
          kind: "native-transfer",
          prepared: { to: RECIPIENT, value: 1_000_000_000_000_000n },
        },
      },
    )

    expect(estimateGasSpy).toHaveBeenCalledTimes(1)

    rerender({
      kind: "native-transfer",
      prepared: { to: RECIPIENT, value: 2_000_000_000_000_000n },
    })

    expect(estimateGasSpy).toHaveBeenCalledTimes(2)
  })
})
