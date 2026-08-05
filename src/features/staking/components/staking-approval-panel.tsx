"use client"

import type { useApproveEvmToken } from "@/web3/evm/hooks/use-approve-evm-token"

import { TransactionReviewCard } from "@/components/web3/common/transaction-review-card"
import { TransactionStatus } from "@/components/web3/common/transaction-status"
import { useTransactionFeedback } from "@/components/web3/common/transaction-feedback"
import { Button } from "@/components/ui/button"
import { getTransactionExplorerUrl } from "@/web3/evm/adapters/evm-registry.adapter"

type StakingApprovalPanelProps = {
  approval: ReturnType<typeof useApproveEvmToken>
  amount: string
  chainId: number
  onPrepare(): void
  onError(cause: unknown): void
}

/** Feature-local view for the approval step that must complete before USDC staking. */
export function StakingApprovalPanel({
  approval,
  amount,
  chainId,
  onPrepare,
  onError,
}: StakingApprovalPanelProps) {
  const feedback = useTransactionFeedback({
    title: "Approve USDC",
    status: approval.status,
    hash: approval.hash,
    error: approval.error,
    getExplorerUrl: (transactionHash) =>
      getTransactionExplorerUrl(chainId, transactionHash),
  })

  return (
    <div className="space-y-2 rounded border p-3 text-sm">
      <p className="text-muted-foreground">
        Approve this exact USDC amount before staking.
      </p>
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
        Prepare USDC approval
      </Button>
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
          confirmLabel="Confirm USDC approval"
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
