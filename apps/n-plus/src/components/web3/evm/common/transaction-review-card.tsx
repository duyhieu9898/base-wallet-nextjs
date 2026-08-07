import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/i18n/use-translation"
import { type EvmFeeEstimate } from "@nln/web3-evm"
import { type EvmTransactionReview } from "@nln/web3-evm"
export function TransactionReviewCard(props: {
  review: EvmTransactionReview
  feeEstimate: EvmFeeEstimate
  isExecuting: boolean
  disabled: boolean
  onConfirm: () => void
  confirmLabel: string
}) {
  const {
    review,
    feeEstimate,
    isExecuting,
    disabled,
    onConfirm,
    confirmLabel,
  } = props
  const { t } = useTranslation()

  return (
    <div className="bg-muted/40 border-border space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{t.review.title}</h4>
        <span className="bg-primary/10 text-primary rounded px-2 py-0.5 font-mono text-sm">
          {review.action}
        </span>
      </div>

      {review.isMainnet ? (
        <div className="flex items-center gap-1.5 rounded border border-red-500/30 bg-red-500/10 p-2 text-sm font-medium text-red-700 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{t.review.mainnetWarning}</span>
        </div>
      ) : null}

      {review.action === "token-approval" && review.isUnlimitedApproval ? (
        <div className="flex items-center gap-1.5 rounded border border-yellow-500/30 bg-yellow-500/10 p-2 text-sm font-medium text-yellow-700 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{t.review.unlimitedApprovalWarning}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">{t.common.network}:</span>{" "}
          <span className="font-medium">{review.networkName}</span>
        </div>
        <div>
          <span className="text-muted-foreground">{t.review.asset}</span>{" "}
          <span className="font-medium">{review.assetSymbol}</span>
        </div>
        <div className="col-span-2">
          <span className="text-muted-foreground">{t.review.sender}</span>{" "}
          <span className="font-mono text-sm break-all">{review.account}</span>
        </div>

        {review.action === "native-transfer" ||
        review.action === "token-transfer" ? (
          <div className="col-span-2">
            <span className="text-muted-foreground">{t.review.recipient}</span>{" "}
            <span className="font-mono text-sm break-all">
              {review.recipient}
            </span>
          </div>
        ) : null}

        {review.action === "token-approval" ? (
          <div className="col-span-2">
            <span className="text-muted-foreground">{t.review.spender}</span>{" "}
            <span className="font-mono text-sm break-all">
              {review.spender}
            </span>
          </div>
        ) : null}

        {review.action !== "native-transfer" ? (
          <div className="col-span-2">
            <span className="text-muted-foreground">
              {t.review.tokenContract}
            </span>{" "}
            <span className="font-mono text-sm break-all">
              {review.tokenAddress}
            </span>
          </div>
        ) : null}

        <div className="col-span-2">
          <span className="text-muted-foreground">{t.review.amount}</span>{" "}
          <span className="font-semibold">
            {review.amount} {review.assetSymbol}
          </span>
        </div>

        <div className="border-border col-span-2 mt-1 border-t pt-2">
          <span className="text-muted-foreground font-medium">
            {t.review.estimatedMaxFee}
          </span>{" "}
          {feeEstimate.status === "estimating" ? (
            <span className="text-muted-foreground italic">
              {t.review.estimatingGas}
            </span>
          ) : feeEstimate.status === "success" && feeEstimate.formattedFee ? (
            <span className="text-foreground font-semibold">
              ~{feeEstimate.formattedFee} {feeEstimate.nativeSymbol}
            </span>
          ) : feeEstimate.status === "error" ? (
            <span className="text-destructive font-mono text-sm">
              {t.review.feeEstimateFailed.replace(
                "{message}",
                feeEstimate.error?.message ?? t.errors.genericRpcFailed,
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      </div>

      <Button className="mt-2 w-full" disabled={disabled} onClick={onConfirm}>
        {isExecuting ? t.transfer.openingWallet : confirmLabel}
      </Button>
    </div>
  )
}
