import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import type { Address } from "viem"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  getDefaultEvmNetwork,
  getEvmTokensForChain,
} from "../../chain/registry/evm-registry.adapter"
import type { EvmSelection } from "../../chain/selection/evm-selection"
import { useEvmAllowances } from "./use-evm-allowances"

const CHAIN_ID = 11155111
const ACCOUNT: Address = "0x086d9feCB2F117369fAbDB884eC6851b36595444"
const SPENDER: Address = "0x2222222222222222222222222222222222222222"
/**
 * The default token list is whatever the registry holds for this chain. Fixing
 * it to one address made these tests break the moment a second token was
 * registered — the assumption this suite is meant to guard against.
 */
const registryTokens = getEvmTokensForChain(CHAIN_ID)
const TOKEN: Address = registryTokens[0]!.address

/** One multicall entry per registry token, so lengths always agree. */
function successResults() {
  return registryTokens.map(() => ({ status: "success", result: 0n }))
}
const UNKNOWN_TOKEN: Address = "0x0000000000000000000000000000000000000009"

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
let queryState: {
  data?: unknown
  isPending: boolean
  isFetching: boolean
  isError: boolean
  error: Error | null
}
let lastParams: {
  contracts?: readonly { args?: readonly unknown[] }[]
  query?: { enabled?: boolean }
} = {}

vi.mock("wagmi", () => ({
  useReadContracts: (params: typeof lastParams) => {
    lastParams = params
    return { ...queryState, refetch: vi.fn(async () => queryState) }
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

beforeEach(() => {
  selection = readySelection
  queryState = {
    data: undefined,
    isPending: true,
    isFetching: false,
    isError: false,
    error: null,
  }
  lastParams = {}
})

describe("useEvmAllowances", () => {
  it("By default, owner = selected account and registry token list are used", () => {
    renderHook(() => useEvmAllowances({ spenderAddress: SPENDER }), { wrapper })

    expect(lastParams.query?.enabled).toBe(true)
    expect(lastParams.contracts).toHaveLength(registryTokens.length)
    for (const contract of lastParams.contracts ?? []) {
      expect(contract.args).toEqual([ACCOUNT, SPENDER])
    }
  })

  it("Do not run query when spender is missing", () => {
    const { result } = renderHook(() => useEvmAllowances({}), { wrapper })

    expect(lastParams.query?.enabled).toBe(false)
    expect(result.current.isPending).toBe(false)
  })

  it("dedupe identical tokens from different casing, creating only one call", () => {
    renderHook(
      () =>
        useEvmAllowances({
          spenderAddress: SPENDER,
          tokenAddresses: [TOKEN, TOKEN.toLowerCase() as Address, TOKEN],
        }),
      { wrapper },
    )

    expect(lastParams.contracts).toHaveLength(1)
  })

  it("Distinguish between incorrectly formatted addresses and tokens that are not in the registry", () => {
    const { result } = renderHook(
      () =>
        useEvmAllowances({
          spenderAddress: SPENDER,
          tokenAddresses: [TOKEN, "0xnope" as Address, UNKNOWN_TOKEN],
        }),
      { wrapper },
    )

    expect(result.current.hasConfigurationError).toBe(true)
    expect(result.current.rejectedTokens).toEqual([
      { address: "0xnope", code: "INVALID_ADDRESS" },
      { address: UNKNOWN_TOKEN, code: "TOKEN_NOT_CONFIGURED" },
    ])
    // Valid tokens can still be queried normally
    expect(lastParams.contracts).toHaveLength(1)
  })

  it("Map the successful result and index it by canonical key", () => {
    queryState = {
      ...queryState,
      data: [
        { status: "success", result: 5_000_000n },
        ...successResults().slice(1),
      ],
      isPending: false,
    }

    const { result } = renderHook(
      () => useEvmAllowances({ spenderAddress: SPENDER }),
      { wrapper },
    )

    expect(result.current.allowances).toHaveLength(registryTokens.length)
    const key = `${CHAIN_ID}:${ACCOUNT.toLowerCase()}:${TOKEN.toLowerCase()}:${SPENDER.toLowerCase()}`
    const entry = result.current.allowancesByKey.get(key)
    expect(entry?.status).toBe("success")
    if (entry?.status === "success") {
      expect(entry.allowance).toBe(5_000_000n)
    }
  })

  it("Consider data that differs in length from the request as no data", () => {
    queryState = {
      ...queryState,
      // One result too many for the registry list.
      data: [...successResults(), { status: "success", result: 1n }],
      isPending: false,
    }

    const { result } = renderHook(
      () => useEvmAllowances({ spenderAddress: SPENDER }),
      { wrapper },
    )

    expect(result.current.allowances).toEqual([])
  })
})
