import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Address } from "viem"

import { Web3Lab } from "@/components/web3/web3-lab"
import { TransactionFeedbackProvider } from "@/components/web3/common/transaction-feedback"
import { I18nProvider } from "@/i18n/i18n-provider"
import {
  type EvmSelection,
  getDefaultEvmNetwork,
  getEvmTokensForChain,
} from "@nln/web3-evm"
const CHAIN_ID = 11155111
const ACCOUNT: Address = "0x086d9feCB2F117369fAbDB884eC6851b36595444"
const network = getDefaultEvmNetwork()
const registryTokens = getEvmTokensForChain(CHAIN_ID)

const mockReadySelection: EvmSelection = {
  status: "ready",
  account: ACCOUNT,
  walletChainId: CHAIN_ID,
  chainId: CHAIN_ID,
  network,
  networks: [network],
}

vi.mock("@nln/web3-evm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@nln/web3-evm")>()
  return {
    ...actual,
    useEvmSelection: () => mockReadySelection,
    useEvmWallet: () => ({
      wallet: { connected: true, connecting: false, address: ACCOUNT },
      selection: mockReadySelection,
      connectors: [],
      connect: vi.fn(),
      disconnect: vi.fn(),
      connectError: null,
      switchChain: vi.fn(),
      switchChainPending: false,
    }),
    useEvmBalances: () => ({
      native: {
        formattedAmount: "1.5",
        symbol: network.chain.nativeCurrency.symbol,
      },
      tokens: registryTokens.map((token) => ({
        status: "success" as const,
        tokenAddress: token.address,
        balance: { formattedAmount: "100.0", symbol: token.symbol },
      })),
      byAddress: new Map(
        registryTokens.map((token) => [
          token.address,
          { formattedAmount: "100.0", symbol: token.symbol },
        ]),
      ),
      hasPartialFailures: false,
      isPending: false,
      isFetching: false,
      isError: false,
      errors: [],
      refetch: vi.fn(),
    }),
    useEvmTransactionHistory: () => ({
      transactions: [],
      clearTransactions: vi.fn(),
    }),
    useSendEvmNative: () => ({
      prepare: vi.fn(),
      confirmSend: vi.fn(),
      review: null,
      feeEstimate: { status: "idle" },
      isSending: false,
      hash: null,
      receiptStatus: null,
      isReceiptLoading: false,
      status: "idle",
      error: null,
      reset: vi.fn(),
    }),
    useSendEvmToken: () => ({
      prepare: vi.fn(),
      confirmSend: vi.fn(),
      review: null,
      feeEstimate: { status: "idle" },
      isPreparing: false,
      simulateError: null,
      canSend: false,
      isWriting: false,
      hash: null,
      receiptStatus: null,
      isReceiptLoading: false,
      status: "idle",
      error: null,
      reset: vi.fn(),
    }),
    useApproveEvmToken: () => ({
      prepare: vi.fn(),
      confirmApprove: vi.fn(),
      review: null,
      feeEstimate: { status: "idle" },
      isPreparing: false,
      simulateError: null,
      canApprove: false,
      isWriting: false,
      hash: null,
      receiptStatus: null,
      isReceiptLoading: false,
      status: "idle",
      error: null,
    }),
  }
})

vi.mock("@/features/staking/hooks/use-staking-position", () => ({
  useStakingPosition: () => ({
    selection: mockReadySelection,
    deployment: { status: "active" },
    nativeAmount: 0n,
    tokenAmount: 0n,
    token: registryTokens[0] ?? null,
    nativeCurrency: network.chain.nativeCurrency,
    isPending: false,
    error: null,
    refetch: vi.fn(),
  }),
}))

vi.mock("@/features/staking/hooks/use-staking-write", () => ({
  useStakingWrite: () => ({
    prepared: null,
    prepare: vi.fn(),
    confirm: vi.fn(),
    canConfirm: false,
    isSimulating: false,
    isWriting: false,
    hash: null,
    receiptStatus: null,
    isReceiptLoading: false,
    error: null,
    reset: vi.fn(),
  }),
}))

function renderLab() {
  render(
    <I18nProvider>
      <TransactionFeedbackProvider>
        <Web3Lab />
      </TransactionFeedbackProvider>
    </I18nProvider>,
  )
}

describe("Web3Lab Composition", () => {
  it("renders all domain sections including TransferSection when selection is ready", () => {
    renderLab()

    // Wallet card
    expect(screen.getByText("EVM Wallet")).toBeInTheDocument()

    // Network card
    expect(screen.getByText("Network")).toBeInTheDocument()

    // Balance card
    expect(screen.getByText("Balance")).toBeInTheDocument()

    // Transfer Section & Forms (P1 Regression Guard)
    expect(screen.getByText(/Transactions \(testnet\)/i)).toBeInTheDocument()

    // History card
    expect(screen.getByText(/Recent Transaction History/i)).toBeInTheDocument()

    // Every registry token reaches the UI. The lab used to render only
    // `tokens[0]`, so a token added to `evm-tokens.json` never appeared.
    //
    // Asserted per region, not "somewhere on the page": the balance card and the
    // transfer picker each pick their own token list, and a page-wide search
    // lets one of them cover for the other.
    for (const token of registryTokens) {
      // Balance card — label comes from `balance.tokenMetadata`.
      expect(
        screen.getByText(`${token.symbol} (registry metadata)`),
      ).toBeInTheDocument()
    }

    if (registryTokens.length > 1) {
      // Transfer section — the picker that makes transfer/approve reachable.
      for (const token of registryTokens) {
        expect(
          screen.getByRole("button", { name: token.symbol }),
        ).toBeInTheDocument()
      }
    }
  })

  it.runIf(registryTokens.length > 1)(
    "points the transfer and approval forms at the token the picker selects",
    () => {
      renderLab()

      const [first, second] = registryTokens
      expect(
        screen.getByText(`Token Transfer: ${first!.symbol} (${first!.name})`),
      ).toBeInTheDocument()

      // Selecting a token must move the forms, not just highlight a button.
      fireEvent.click(screen.getByRole("button", { name: second!.symbol }))

      expect(
        screen.getByText(`Token Transfer: ${second!.symbol} (${second!.name})`),
      ).toBeInTheDocument()
      expect(
        screen.getByText(`Token Approval: ${second!.symbol} (${second!.name})`),
      ).toBeInTheDocument()
      expect(
        screen.queryByText(`Token Transfer: ${first!.symbol} (${first!.name})`),
      ).not.toBeInTheDocument()
    },
  )
})
