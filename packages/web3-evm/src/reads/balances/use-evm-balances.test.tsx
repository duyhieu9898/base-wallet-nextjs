import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { parseUnits, type Address } from "viem"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  getDefaultEvmNetwork,
  getEvmTokensForChain,
} from "../../chain/registry/evm-registry.adapter"
import type { EvmSelection } from "../../chain/selection/evm-selection"
import { useEvmBalances } from "./use-evm-balances"

const CHAIN_ID = 11155111
const ACCOUNT: Address = "0x086d9feCB2F117369fAbDB884eC6851b36595444"
/**
 * Driven by the registry, not by a fixed token. These tests used to assume the
 * chain had exactly one ERC-20, so adding a second one to `evm-tokens.json`
 * broke them — the same single-token assumption that hid the token in the UI.
 */
const registryTokens = getEvmTokensForChain(CHAIN_ID)
const firstToken = registryTokens[0]!

/** One multicall entry per registry token, so lengths always agree. */
function successResults(overrides?: Record<number, unknown>) {
  return registryTokens.map((_, index) =>
    overrides && index in overrides
      ? overrides[index]
      : { status: "success", result: 0n },
  )
}

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

vi.mock("../../chain/selection/use-evm-selection", () => ({
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

    expect(contracts).toHaveLength(registryTokens.length)
    expect(contracts.map((contract) => contract.address)).toEqual(
      registryTokens.map((token) => token.address),
    )
    for (const contract of contracts) {
      expect(contract.functionName).toBe("balanceOf")
      expect(contract.args).toEqual([ACCOUNT])
      expect(contract.chainId).toBe(CHAIN_ID)
    }
  })

  it("map the success result and index by lowercase token address", () => {
    balanceState = {
      ...idleQuery(),
      data: { value: 10n ** 18n },
      isPending: false,
    }
    contractsState = {
      ...idleQuery(),
      data: successResults({
        0: {
          status: "success",
          result: parseUnits("2.5", firstToken.expectedDecimals),
        },
      }),
      isPending: false,
    }

    const { result } = renderHook(() => useEvmBalances(), { wrapper })

    expect(result.current.native?.formattedAmount).toBe("1")
    expect(result.current.tokens).toHaveLength(registryTokens.length)
    expect(result.current.hasPartialFailures).toBe(false)

    const byAddress = result.current.byAddress.get(
      firstToken.address.toLowerCase() as Address,
    )
    expect(byAddress?.formattedAmount).toBe("2.5")
    expect(byAddress?.symbol).toBe(firstToken.symbol)
  })

  it("keep failures partial and expose errors", () => {
    contractsState = {
      ...idleQuery(),
      // Only the first token fails: the rest must still map through.
      data: successResults({
        0: { status: "failure", error: new Error("multicall reverted") },
      }),
      isPending: false,
    }

    const { result } = renderHook(() => useEvmBalances(), { wrapper })

    expect(result.current.hasPartialFailures).toBe(true)
    expect(result.current.tokens[0].status).toBe("failure")
    expect(
      result.current.tokens.slice(1).every((t) => t.status === "success"),
    ).toBe(true)
    expect(result.current.errors).toHaveLength(1)
  })

  it("Consider data that differs in length from the token list as no data, do not map to index deviation", () => {
    contractsState = {
      ...idleQuery(),
      // One result too many — stale data from a previous query key.
      data: [...successResults(), { status: "success", result: 1n }],
      isPending: false,
    }

    const { result } = renderHook(() => useEvmBalances(), { wrapper })

    expect(result.current.tokens).toEqual([])
    expect(result.current.hasPartialFailures).toBe(false)
  })
})
