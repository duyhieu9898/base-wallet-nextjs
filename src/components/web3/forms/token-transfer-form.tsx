"use client"

import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TransactionReviewCard } from "@/components/web3/common/transaction-review-card"
import { TransactionStatus } from "@/components/web3/common/transaction-status"
import { useTranslation } from "@/i18n/use-translation"
import { useSendEvmToken } from "@/web3/evm/hooks/use-send-evm-token"
import type { AssetContractConfig } from "@/web3/evm/registry/evm-registry.types"

function Field(props: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{props.label}</Label>
      <div>{props.children}</div>
    </div>
  )
}

export function TokenTransferForm(props: {
  chainId: number
  token: AssetContractConfig
}) {
  const { chainId, token } = props
  const { t } = useTranslation()
  const {
    prepare,
    confirmSend,
    review,
    feeEstimate,
    isPreparing,
    simulateError,
    canSend,
    isWriting,
    hash,
    receiptStatus,
    isReceiptLoading,
    receiptError,
    stopTrackingReceipt,
    status,
    error: hookError,
    reset,
  } = useSendEvmToken({ tokenAddress: token.address })

  const [recipient, setRecipient] = useState("")
  const [amount, setAmount] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  const isLocked = status === "awaiting-signature" || status === "confirming"

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
    try {
      await confirmSend()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  return (
    <div className="space-y-3">
      <p className="font-medium">
        {t.transfer.tokenTransferTitle
          .replace("{symbol}", token.symbol)
          .replace("{name}", token.name)}
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
          placeholder="1.0"
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
            <p className="text-muted-foreground text-xs">
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
            !canSend ||
            isPreparing ||
            feeEstimate.status === "idle" ||
            feeEstimate.status === "estimating"
          }
          onConfirm={onConfirm}
          confirmLabel={t.transfer.confirmSendToken.replace(
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
