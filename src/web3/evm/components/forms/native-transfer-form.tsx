"use client"

import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TransactionReviewCard } from "@/web3/evm/components/common/transaction-review-card"
import { TransactionStatus } from "@/web3/evm/components/common/transaction-status"
import { useTransactionFeedback } from "@/components/web3/common/transaction-feedback"
import { useTranslation } from "@/i18n/use-translation"
import {
  type EvmNetworkConfig,
  getEvmExplorerUrl,
  useSendEvmNative,
} from "@/web3/evm"
function Field(props: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{props.label}</Label>
      <div>{props.children}</div>
    </div>
  )
}

export function NativeTransferForm(props: {
  chainId: number
  network: EvmNetworkConfig
}) {
  const { chainId, network } = props
  const { t } = useTranslation()
  const {
    prepare,
    confirmSend,
    review,
    feeEstimate,
    isSending,
    hash,
    receiptStatus,
    isReceiptLoading,
    receiptError,
    stopTrackingReceipt,
    status,
    error: hookError,
    reset,
  } = useSendEvmNative()

  const [recipient, setRecipient] = useState("")
  const [amount, setAmount] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  const isLocked = status === "awaiting-signature" || status === "confirming"
  const feedback = useTransactionFeedback({
    title: t.transfer.sendNotificationTitle.replace(
      "{symbol}",
      network.chain.nativeCurrency.symbol,
    ),
    status,
    hash,
    error: hookError,
    getExplorerUrl: (transactionHash) =>
      getEvmExplorerUrl(chainId, transactionHash, "transaction"),
  })

  function onPrepare() {
    setFormError(null)
    try {
      prepare({ to: recipient, amount })
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  async function onConfirm() {
    setFormError(null)
    feedback.begin()
    try {
      await confirmSend()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  return (
    <div className="space-y-3">
      <p className="font-medium">
        {t.transfer.nativeTitle.replace(
          "{symbol}",
          network.chain.nativeCurrency.symbol,
        )}
      </p>
      <Field label={t.common.recipient}>
        <Input
          className="font-mono"
          placeholder="0x..."
          value={recipient}
          disabled={review !== null}
          onChange={(event) => setRecipient(event.target.value)}
        />
      </Field>
      <Field label={t.common.amount}>
        <Input
          value={amount}
          inputMode="decimal"
          placeholder="0.01"
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

      {review ? (
        <TransactionReviewCard
          review={review}
          feeEstimate={feeEstimate}
          isExecuting={isSending}
          disabled={
            hash !== null ||
            isSending ||
            feeEstimate.status === "idle" ||
            feeEstimate.status === "estimating"
          }
          onConfirm={onConfirm}
          confirmLabel={t.transfer.confirmSendNative.replace(
            "{symbol}",
            network.chain.nativeCurrency.symbol,
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
