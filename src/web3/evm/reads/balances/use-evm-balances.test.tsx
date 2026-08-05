import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import type { Address } from "viem"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { getDefaultEvmNetwork } from "@/web3/evm/chain/registry/evm-registry.adapter"
import type { EvmSelection } from "@/web3/evm/chain/selection/evm-selection"
import { useEvmBalances } from "@/web3/evm/reads/balances/use-evm-balances"

const CHAIN_ID = 11155111
const ACCOUNT: Address = "0x086d9feCB2F117369fAbDB884eC6851b36595444"
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

const disconnectedSelection: EvmSelection = {
  status: "disconnected",
  account: null,
  walletChainId: null,
  chainId: CHAIN_ID,
  network,
  networks: [network],
}

type QueryState = {
  data?: unknown
  isPending: boolean
  isFetching: boolean
  isError: boolean
  error: Error | null
}

let selection: EvmSelection = readySelection
let balanceState: QueryState
let contractsState: QueryState
let lastBalanceParams: { address?: Address; query?: { enabled?: boolean } } = {}
let lastContractsParams: {
  contracts?: readonly unknown[]
  query?: { enabled?: boolean }
} = {}

vi.mock("wagmi", () => ({
  useBalance: (params: typeof lastBalanceParams) => {
    lastBalanceParams = params
    return { ...balanceState, refetch: vi.fn(async () => balanceState) }
  },
  useReadContracts: (params: typeof lastContractsParams) => {
    lastContractsParams = params
    return { ...contractsState, refetch: vi.fn(async () => contractsState) }
  },
}))

vi.mock("@/web3/evm/chain/selection/use-evm-selection", () => ({
  useEvmSelection: () => selection,
}))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function idleQuery(): QueryState {
  return {
    data: undefined,
    isPending: true,
    isFetching: false,
    isError: false,
    error: null,
  }
}

beforeEach(() => {
  selection = readySelection
  balanceState = idleQuery()
  contractsState = idleQuery()
  lastBalanceParams = {}
  lastContractsParams = {}
})

describe("useEvmBalances", () => {
  it("Do not read onchain when disconnected, even if there is a default chainId", () => {
    selection = disconnectedSelection

    const { result } = renderHook(() => useEvmBalances(), { wrapper })

    expect(lastBalanceParams.query?.enabled).toBe(false)
    expect(lastContractsParams.query?.enabled).toBe(false)
    // Didn't set up any contract calls because I don't have an account yet
    expect(lastContractsParams.contracts).toEqual([])
    // Query disabled is not displayed pending
    expect(result.current.isPending).toBe(false)
    expect(result.current.isFetching).toBe(false)
  })

  it("Build multicall balanceOf for network tokens when ready", () => {
    renderHook(() => useEvmBalances(), { wrapper })

    expect(lastContractsParams.query?.enabled).toBe(true)
    const contracts = lastContractsParams.contracts as readonly {
      address: Address
      functionName: string
      args: readonly unknown[]
      chainId: number
    }[]

    expect(contracts).toHaveLength(1)
    expect(contracts[0].address).toBe(USDC_SEPOLIA)
    expect(contracts[0].functionName).toBe("balanceOf")
    expect(contracts[0].args).toEqual([ACCOUNT])
    expect(contracts[0].chainId).toBe(CHAIN_ID)
  })

  it("map the success result and index by lowercase token address", () => {
    balanceState = {
      ...idleQuery(),
      data: { value: 10n ** 18n },
      isPending: false,
    }
    contractsState = {
      ...idleQuery(),
      data: [{ status: "success", result: 2_500_000n }],
      isPending: false,
    }

    const { result } = renderHook(() => useEvmBalances(), { wrapper })

    expect(result.current.native?.formattedAmount).toBe("1")
    expect(result.current.tokens).toHaveLength(1)
    expect(result.current.hasPartialFailures).toBe(false)

    const byAddress = result.current.byAddress.get(
      USDC_SEPOLIA.toLowerCase() as Address,
    )
    expect(byAddress?.formattedAmount).toBe("2.5")
    expect(byAddress?.symbol).toBe("USDC")
  })

  it("keep failures partial and expose errors", () => {
    contractsState = {
      ...idleQuery(),
      data: [{ status: "failure", error: new Error("multicall reverted") }],
      isPending: false,
    }

    const { result } = renderHook(() => useEvmBalances(), { wrapper })

    expect(result.current.hasPartialFailures).toBe(true)
    expect(result.current.tokens[0].status).toBe("failure")
    expect(result.current.errors).toHaveLength(1)
  })

  it("Consider data that differs in length from the token list as no data, do not map to index deviation", () => {
    contractsState = {
      ...idleQuery(),
      // 2 results for 1 token — stale data from previous query key
      data: [
        { status: "success", result: 1n },
        { status: "success", result: 2n },
      ],
      isPending: false,
    }

    const { result } = renderHook(() => useEvmBalances(), { wrapper })

    expect(result.current.tokens).toEqual([])
    expect(result.current.hasPartialFailures).toBe(false)
  })
})
