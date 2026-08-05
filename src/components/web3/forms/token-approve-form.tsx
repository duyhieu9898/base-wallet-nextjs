"use client"

import { useState, type ReactNode } from "react"
import type { Address } from "viem"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TransactionReviewCard } from "@/components/web3/common/transaction-review-card"
import { TransactionStatus } from "@/components/web3/common/transaction-status"
import { useTransactionFeedback } from "@/components/web3/common/transaction-feedback"
import { useTranslation } from "@/i18n/use-translation"
import { getTransactionExplorerUrl } from "@/web3/evm/adapters/evm-registry.adapter"
import { useApproveEvmToken } from "@/web3/evm/hooks/use-approve-evm-token"
import type { AssetContractConfig } from "@/web3/evm/registry/evm-registry.types"

function Field(props: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{props.label}</Label>
      <div>{props.children}</div>
    </div>
  )
}

export function TokenApproveForm(props: {
  chainId: number
  token: AssetContractConfig
}) {
  const { chainId, token } = props
  const { t } = useTranslation()
  const [spender, setSpender] = useState("")
  const [amount, setAmount] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  const {
    prepare,
    confirmApprove,
    review,
    feeEstimate,
    isPreparing,
    simulateError,
    canApprove,
    isWriting,
    hash,
    receiptStatus,
    isReceiptLoading,
    receiptError,
    stopTrackingReceipt,
    status,
    error: hookError,
    reset,
  } = useApproveEvmToken({
    tokenAddress: token.address,
    spenderAddress: spender ? (spender as Address) : undefined,
  })

  const isLocked = status === "awaiting-signature" || status === "confirming"
  const feedback = useTransactionFeedback({
    title: t.transfer.approveNotificationTitle.replace(
      "{symbol}",
      token.symbol,
    ),
    status,
    hash,
    error: hookError,
    getExplorerUrl: (transactionHash) =>
      getTransactionExplorerUrl(chainId, transactionHash),
  })

  function onPrepare() {
    setFormError(null)
    try {
      prepare({ spender, amount })
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  async function onConfirm() {
    setFormError(null)
    feedback.begin()
    try {
      await confirmApprove()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  return (
    <div className="space-y-3">
      <p className="font-medium">
        {t.transfer.tokenApproveTitle
          .replace("{symbol}", token.symbol)
          .replace("{name}", token.name)}
      </p>
      <Field label={t.common.spender}>
        <Input
          className="font-mono"
          placeholder="0x..."
          value={spender}
          disabled={review !== null}
          onChange={(event) => setSpender(event.target.value)}
        />
      </Field>
      <Field label={t.transfer.allowanceAmount}>
        <Input
          value={amount}
          inputMode="decimal"
          placeholder="100.0"
          disabled={review !== null}
          onChange={(event) => setAmount(event.target.value)}
        />
      </Field>

      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={review !== null}
          onClick={onPrepare}
        >
          {t.common.prepareReview}
        </Button>
        {hash !== null && receiptError !== null ? (
          <div className="space-y-1">
            <Button variant="ghost" size="sm" onClick={stopTrackingReceipt}>
              {t.common.stopTracking}
            </Button>
            <p className="text-muted-foreground text-sm">
              {t.common.stopTrackingDescription}
            </p>
          </div>
        ) : review ? (
          <Button variant="ghost" size="sm" disabled={isLocked} onClick={reset}>
            {t.common.reset}
          </Button>
        ) : null}
      </div>

      {isPreparing ? (
        <p className="text-muted-foreground">{t.transfer.simulating}</p>
      ) : null}
      {simulateError ? (
        <p className="text-destructive">
          {t.transfer.simulationFailed.replace(
            "{message}",
            simulateError.message,
          )}
        </p>
      ) : null}

      {review ? (
        <TransactionReviewCard
          review={review}
          feeEstimate={feeEstimate}
          isExecuting={isWriting}
          disabled={
            hash !== null ||
            isWriting ||
            !canApprove ||
            isPreparing ||
            feeEstimate.status === "idle" ||
            feeEstimate.status === "estimating"
          }
          onConfirm={onConfirm}
          confirmLabel={t.transfer.confirmApproveToken.replace(
            "{symbol}",
            token.symbol,
          )}
        />
      ) : null}

      <TransactionStatus
        chainId={chainId}
        hash={hash}
        receiptStatus={receiptStatus}
        isReceiptLoading={isReceiptLoading}
        error={hookError}
        formError={formError}
      />
    </div>
  )
}
