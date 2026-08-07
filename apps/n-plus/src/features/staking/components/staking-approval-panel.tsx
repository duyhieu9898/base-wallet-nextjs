"use client"

import { getEvmExplorerUrl, type useApproveEvmToken } from "@nln/web3-evm"
import { TransactionReviewCard } from "@/components/web3/evm/common/transaction-review-card"
import { TransactionStatus } from "@/components/web3/evm/common/transaction-status"
import { useTransactionFeedback } from "@/components/web3/common/transaction-feedback"
import { Button } from "@/components/ui/button"
type StakingApprovalPanelProps = {
  approval: ReturnType<typeof useApproveEvmToken>
  amount: string
  chainId: number
  /** Registry symbol of the vault's ERC-20; never a literal. */
  tokenSymbol: string
  onPrepare(): void
  onError(cause: unknown): void
}

/** Feature-local view for the approval step that must complete before token staking. */
export function StakingApprovalPanel({
  approval,
  amount,
  chainId,
  tokenSymbol,
  onPrepare,
  onError,
}: StakingApprovalPanelProps) {
  const feedback = useTransactionFeedback({
    title: `Approve ${tokenSymbol}`,
    status: approval.status,
    hash: approval.hash,
    error: approval.error,
    getExplorerUrl: (transactionHash) =>
      getEvmExplorerUrl(chainId, transactionHash, "transaction"),
  })

  // A reverted approval leaves `review` and `hash` set, which disables prepare
  // and confirm alike. Without a way back the whole staking flow is stuck until
  // a reload, so the recovery affordances of the foundation approve form belong
  // here too: stop tracking an unreachable receipt, reset an outcome that is
  // already terminal.
  const isLocked =
    approval.status === "awaiting-signature" || approval.status === "confirming"

  function recover(action: () => void) {
    try {
      action()
    } catch (cause) {
      onError(cause)
    }
  }

  return (
    <div className="space-y-2 rounded border p-3 text-sm">
      <p className="text-muted-foreground">
        Approve this exact {tokenSymbol} amount before staking.
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={approval.review !== null}
          onClick={() => {
            onPrepare()
            try {
              approval.prepare({ amount })
            } catch (cause) {
              onError(cause)
            }
          }}
        >
          Prepare {tokenSymbol} approval
        </Button>
        {approval.hash !== null && approval.receiptError !== null ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => recover(approval.stopTrackingReceipt)}
          >
            Stop tracking approval
          </Button>
        ) : approval.review ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={isLocked}
            onClick={() => recover(approval.reset)}
          >
            Reset approval
          </Button>
        ) : null}
      </div>
      {approval.review ? (
        <TransactionReviewCard
          review={approval.review}
          feeEstimate={approval.feeEstimate}
          isExecuting={approval.isWriting}
          disabled={
            !approval.canApprove ||
            approval.isPreparing ||
            approval.isWriting ||
            approval.hash !== null
          }
          onConfirm={() => {
            feedback.begin()
            void approval.confirmApprove().catch(onError)
          }}
          confirmLabel={`Confirm ${tokenSymbol} approval`}
        />
      ) : null}
      <TransactionStatus
        chainId={chainId}
        hash={approval.hash}
        receiptStatus={approval.receiptStatus}
        isReceiptLoading={approval.isReceiptLoading}
        error={approval.error}
        formError={null}
      />
    </div>
  )
}
