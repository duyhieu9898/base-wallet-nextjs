import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Address } from "viem"

import { Web3Lab } from "@/components/web3/web3-lab"
import { I18nProvider } from "@/i18n/i18n-provider"
import { getDefaultEvmNetwork } from "@/web3/evm/adapters/evm-registry.adapter"
import type { EvmSelection } from "@/web3/evm/selection/evm-selection"

const CHAIN_ID = 11155111
const ACCOUNT: Address = "0x086d9feCB2F117369fAbDB884eC6851b36595444"
const network = getDefaultEvmNetwork()

const mockReadySelection: EvmSelection = {
  status: "ready",
  account: ACCOUNT,
  walletChainId: CHAIN_ID,
  chainId: CHAIN_ID,
  network,
  networks: [network],
}

vi.mock("@/web3/evm/selection/use-evm-selection", () => ({
  useEvmSelection: () => mockReadySelection,
}))

vi.mock("@/web3/evm/hooks/use-evm-wallet", () => ({
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
}))

vi.mock("@/web3/evm/hooks/use-evm-native-balance", () => ({
  useEvmNativeBalance: () => ({
    isPending: false,
    balance: { formattedAmount: "1.5", symbol: "ETH" },
    refetch: vi.fn(),
    isError: false,
    error: null,
  }),
}))

vi.mock("@/web3/evm/hooks/use-evm-token-balance", () => ({
  useEvmTokenBalance: () => ({
    isPending: false,
    balance: { formattedAmount: "100.0", symbol: "USDC" },
    refetch: vi.fn(),
    isError: false,
    error: null,
  }),
}))

vi.mock("@/web3/evm/hooks/use-evm-transaction-history", () => ({
  useEvmTransactionHistory: () => ({
    transactions: [],
    clearTransactions: vi.fn(),
  }),
}))

vi.mock("@/web3/evm/hooks/use-send-evm-native", () => ({
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
}))

vi.mock("@/web3/evm/hooks/use-send-evm-token", () => ({
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
}))

vi.mock("@/web3/evm/hooks/use-approve-evm-token", () => ({
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
    reset: vi.fn(),
  }),
}))

vi.mock("@/features/staking/hooks/use-staking-position", () => ({
  useStakingPosition: () => ({
    selection: mockReadySelection,
    deployment: { status: "active" },
    nativeAmount: 0n,
    usdcAmount: 0n,
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

describe("Web3Lab Composition", () => {
  it("renders all domain sections including TransferSection when selection is ready", () => {
    render(
      <I18nProvider>
        <Web3Lab />
      </I18nProvider>,
    )

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
  })
})
