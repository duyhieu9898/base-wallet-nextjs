import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import type { Address, Hash } from "viem"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { TransactionFeedbackProvider } from "@/components/web3/common/transaction-feedback"
import { I18nProvider } from "@/i18n/i18n-provider"
import {
  type EvmSelection,
  findEvmToken,
  getDefaultEvmNetwork,
} from "@nln/web3-evm"
import { findStakingDeployment } from "../contracts/staking-deployments"
import { StakingActionPanel } from "./staking-action-panel"

/**
 * The feedback notification is the only place the app names the transaction a
 * user is about to sign. A hardcoded title made every stake and unstake announce
 * itself as "Stake USDC", so these tests drive the real pickers rather than
 * asserting on a prop.
 */

const CHAIN_ID = 11155111
const ACCOUNT: Address = "0x086d9feCB2F117369fAbDB884eC6851b36595444"
const TX_HASH: Hash =
  "0xcccc1111222233334444555566667777888899990000aaaabbbbccccddddeeee"

const network = getDefaultEvmNetwork()
const deployment = findStakingDeployment(CHAIN_ID)

// Asset names are whatever the registry says for this deployment. Hardcoding
// them here would re-introduce exactly the assumption these tests exist to catch.
const NATIVE_SYMBOL = network.chain.nativeCurrency.symbol
const TOKEN_SYMBOL =
  (deployment.status === "active"
    ? findEvmToken(CHAIN_ID, deployment.tokenAddress)?.symbol
    : null) ?? "token"

function selectionWithNativeSymbol(symbol: string): EvmSelection {
  const chain = {
    ...network.chain,
    nativeCurrency: { ...network.chain.nativeCurrency, symbol },
  }
  const patched = { ...network, chain }

  return {
    status: "ready",
    account: ACCOUNT,
    walletChainId: CHAIN_ID,
    chainId: CHAIN_ID,
    network: patched,
    networks: [patched],
  }
}

let selection: EvmSelection = selectionWithNativeSymbol(
  network.chain.nativeCurrency.symbol,
)

let allowanceData: bigint | undefined
const mutateAsync = vi.fn(async () => TX_HASH)

vi.mock("wagmi", () => ({
  useReadContract: () => ({
    data: allowanceData,
    isPending: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useSimulateContract: () => ({
    data: { request: { functionName: "stakeNative" } },
    isPending: false,
    isSuccess: true,
    error: null,
  }),
  useEstimateGas: () => ({ data: undefined, isPending: false, error: null }),
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
  useEstimateFeesPerGas: () => ({
    data: undefined,
    isPending: false,
    error: null,
  }),
  useGasPrice: () => ({ data: undefined, isPending: false, error: null }),
  useWriteContract: () => ({
    writeContractAsync: mutateAsync,
    mutateAsync,
    isPending: false,
    reset: vi.fn(),
  }),
  useWaitForTransactionReceipt: () => ({
    data: undefined,
    isLoading: false,
    error: null,
  }),
}))

vi.mock("@nln/web3-evm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@nln/web3-evm")>()
  return {
    ...actual,
    useEvmSelection: () => selection,
  }
})

function renderPanel() {
  if (deployment.status !== "active") {
    throw new Error("Sepolia test vault must be configured for this test.")
  }

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <TransactionFeedbackProvider>{children}</TransactionFeedbackProvider>
        </I18nProvider>
      </QueryClientProvider>
    )
  }

  return render(
    <StakingActionPanel
      deployment={deployment}
      chainId={CHAIN_ID}
      onReceiptSuccess={vi.fn()}
    />,
    { wrapper: Wrapper },
  )
}

/** Walks the panel the way a user does: pick, type, prepare, confirm. */
async function submit(options: {
  asset: string
  operation: "stake" | "unstake"
}) {
  renderPanel()

  fireEvent.click(screen.getByRole("button", { name: options.asset }))
  fireEvent.click(screen.getByRole("button", { name: options.operation }))
  fireEvent.change(screen.getByPlaceholderText("Amount"), {
    target: { value: "1.0" },
  })
  fireEvent.click(
    screen.getByRole("button", { name: `Prepare ${options.operation}` }),
  )

  fireEvent.click(
    await screen.findByRole("button", { name: `Confirm ${options.operation}` }),
  )
}

beforeEach(() => {
  selection = selectionWithNativeSymbol(network.chain.nativeCurrency.symbol)
  allowanceData = undefined
  mutateAsync.mockClear()
  window.localStorage.clear()
})

describe("StakingActionPanel transaction feedback", () => {
  it("names a native stake by the native asset, not the token beside it", async () => {
    await submit({ asset: NATIVE_SYMBOL, operation: "stake" })

    await waitFor(() =>
      expect(screen.getByText(`Stake ${NATIVE_SYMBOL}`)).toBeVisible(),
    )
    expect(screen.queryByText(`Stake ${TOKEN_SYMBOL}`)).not.toBeInTheDocument()
  })

  it("names a native unstake as an unstake", async () => {
    await submit({ asset: NATIVE_SYMBOL, operation: "unstake" })

    await waitFor(() =>
      expect(screen.getByText(`Unstake ${NATIVE_SYMBOL}`)).toBeVisible(),
    )
  })

  it("names a token unstake by its own asset and direction", async () => {
    await submit({ asset: TOKEN_SYMBOL, operation: "unstake" })

    await waitFor(() =>
      expect(screen.getByText(`Unstake ${TOKEN_SYMBOL}`)).toBeVisible(),
    )
  })

  it("labels the native asset from the connected chain, not from a literal", async () => {
    // Sepolia's native symbol happens to be "ETH", so a hardcoded label passes
    // by coincidence. A chain whose native asset is named otherwise does not.
    selection = selectionWithNativeSymbol("XTZ")

    await submit({ asset: "XTZ", operation: "stake" })

    expect(screen.getByRole("button", { name: "XTZ" })).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "ETH" }),
    ).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByText("Stake XTZ")).toBeVisible())
  })

  it("names a token stake once its allowance is proven", async () => {
    allowanceData = 100_000_000_000n

    await submit({ asset: TOKEN_SYMBOL, operation: "stake" })

    await waitFor(() =>
      expect(screen.getByText(`Stake ${TOKEN_SYMBOL}`)).toBeVisible(),
    )
  })
})
