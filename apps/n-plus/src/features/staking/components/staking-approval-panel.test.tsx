import { fireEvent, render, screen } from "@testing-library/react"
import type { Address, Hash } from "viem"
import { describe, expect, it, vi } from "vitest"

import { TransactionFeedbackProvider } from "@/components/web3/common/transaction-feedback"
import { I18nProvider } from "@/i18n/i18n-provider"
import {
  type EvmFeeEstimate,
  type EvmTransactionReview,
  type useApproveEvmToken,
} from "@nln/web3-evm"
import { StakingApprovalPanel } from "./staking-approval-panel"

const CHAIN_ID = 11155111
const ACCOUNT: Address = "0x086d9feCB2F117369fAbDB884eC6851b36595444"
const SPENDER: Address = "0xb786c18d2feB8Ea7ee9d3a295203D7B1420abe43"
const USDC: Address = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
const TX_HASH: Hash =
  "0xaaaa1111222233334444555566667777888899990000aaaabbbbccccddddeeee"

type Approval = ReturnType<typeof useApproveEvmToken>

const review: EvmTransactionReview = {
  action: "token-approval",
  chainId: CHAIN_ID,
  account: ACCOUNT,
  tokenAddress: USDC,
  spender: SPENDER,
  amount: "100",
  rawAmount: 100_000_000n,
  assetSymbol: "USDC",
  networkName: "Sepolia",
  isMainnet: false,
  isUnlimitedApproval: false,
}

const feeEstimate: EvmFeeEstimate = {
  status: "success",
  gasLimit: 45_000n,
  gasPrice: 15_000_000_000n,
  maxFeePerGas: 20_000_000_000n,
  estimatedFee: 900_000_000_000_000n,
  formattedFee: "0.0009",
  nativeSymbol: "ETH",
  error: null,
}

function createApproval(overrides: Partial<Approval>): Approval {
  return {
    prepare: vi.fn(),
    confirmApprove: vi.fn(),
    review: null,
    feeEstimate,
    isPreparing: false,
    simulateError: null,
    canApprove: false,
    isWriting: false,
    hash: null,
    receipt: null,
    receiptStatus: null,
    isReceiptLoading: false,
    receiptError: null,
    stopTrackingReceipt: vi.fn(),
    status: "idle",
    error: null,
    reset: vi.fn(),
    ...overrides,
  } as Approval
}

function renderPanel(approval: Approval) {
  const onError = vi.fn()

  render(
    <I18nProvider>
      <TransactionFeedbackProvider>
        <StakingApprovalPanel
          approval={approval}
          amount="100"
          chainId={CHAIN_ID}
          tokenSymbol="USDC"
          onPrepare={vi.fn()}
          onError={onError}
        />
      </TransactionFeedbackProvider>
    </I18nProvider>,
  )

  return { onError }
}

describe("StakingApprovalPanel recovery", () => {
  it("offers a reset once an approval has reverted", () => {
    // A reverted approval keeps `review` and `hash`, which disables prepare and
    // confirm at the same time. Without this control the staking flow below is
    // unreachable until the page is reloaded.
    const reset = vi.fn()
    const approval = createApproval({
      review,
      hash: TX_HASH,
      receiptStatus: "reverted",
      status: "reverted",
      reset,
    })

    renderPanel(approval)

    expect(
      screen.getByRole("button", { name: "Prepare USDC approval" }),
    ).toBeDisabled()

    const resetButton = screen.getByRole("button", { name: "Reset approval" })
    expect(resetButton).toBeEnabled()

    fireEvent.click(resetButton)
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it("offers to stop tracking a receipt that cannot be reached", () => {
    const stopTrackingReceipt = vi.fn()
    const approval = createApproval({
      review,
      hash: TX_HASH,
      receiptError: Object.assign(new Error("RPC timeout"), {
        code: "RECEIPT_UNAVAILABLE",
      }) as Approval["receiptError"],
      status: "error",
      stopTrackingReceipt,
    })

    renderPanel(approval)

    fireEvent.click(
      screen.getByRole("button", { name: "Stop tracking approval" }),
    )
    expect(stopTrackingReceipt).toHaveBeenCalledTimes(1)
    expect(
      screen.queryByRole("button", { name: "Reset approval" }),
    ).not.toBeInTheDocument()
  })

  it("keeps the reset closed while the approval is still in flight", () => {
    const approval = createApproval({
      review,
      hash: TX_HASH,
      status: "confirming",
    })

    renderPanel(approval)

    expect(
      screen.getByRole("button", { name: "Reset approval" }),
    ).toBeDisabled()
  })

  it("shows no recovery control before anything has been prepared", () => {
    renderPanel(createApproval({}))

    expect(
      screen.queryByRole("button", { name: "Reset approval" }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Stop tracking approval" }),
    ).not.toBeInTheDocument()
  })

  it("reports a refused reset through onError instead of crashing", () => {
    const approval = createApproval({
      review,
      hash: TX_HASH,
      receiptStatus: "reverted",
      status: "reverted",
      reset: vi.fn(() => {
        throw new Error("Cannot replace or reset an active transaction.")
      }),
    })

    const { onError } = renderPanel(approval)

    fireEvent.click(screen.getByRole("button", { name: "Reset approval" }))

    expect(onError).toHaveBeenCalledTimes(1)
  })
})
