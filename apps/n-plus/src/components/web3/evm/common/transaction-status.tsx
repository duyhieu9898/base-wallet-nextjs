"use client"

import type { ReactNode } from "react"
import { CheckCircle2, XCircle } from "lucide-react"
import { Label } from "@/components/ui/label"
import { useTranslation } from "@/i18n/use-translation"
import { getEvmExplorerUrl } from "@nln/web3-evm"
import { type EvmWeb3Error } from "@nln/web3-evm/errors"
function Field(props: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{props.label}</Label>
      <div>{props.children}</div>
    </div>
  )
}

export function TransactionStatus(props: {
  chainId: number
  hash: `0x${string}` | null
  receiptStatus: "success" | "reverted" | null
  isReceiptLoading: boolean
  /** Typed hook error — covers receipt/RPC failures */
  error: EvmWeb3Error | null
  /** Local form error string — covers prepare() validation failures */
  formError: string | null
}) {
  const { chainId, hash, receiptStatus, isReceiptLoading, error, formError } =
    props
  const { t } = useTranslation()

  const displayError = formError ?? error?.message

  if (!hash) {
    if (displayError) {
      return <p className="text-destructive">{displayError}</p>
    }
    return null
  }

  return (
    <div className="space-y-2">
      {displayError ? <p className="text-destructive">{displayError}</p> : null}
      <Field label={t.common.txHash}>
        <a
          className="font-mono underline underline-offset-2"
          href={getEvmExplorerUrl(chainId, hash, "transaction")}
          target="_blank"
          rel="noreferrer noopener"
        >
          {hash}
        </a>
      </Field>
      <Field label={t.common.receipt}>
        {displayError ? (
          t.common.receiptStatusUnavailable
        ) : isReceiptLoading ? (
          t.common.awaitingReceipt
        ) : receiptStatus === "success" ? (
          <span className="inline-flex items-center gap-1 font-medium text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" /> {t.common.success}
          </span>
        ) : receiptStatus === "reverted" ? (
          <span className="inline-flex items-center gap-1 font-medium text-red-700 dark:text-red-400">
            <XCircle className="h-4 w-4" /> {t.common.reverted}
          </span>
        ) : (
          "—"
        )}
      </Field>
    </div>
  )
}
