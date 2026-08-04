"use client"

import { CheckCircle2, HelpCircle, Loader2, XCircle } from "lucide-react"
import { useTranslation } from "@/i18n/use-translation"

export function StatusBadge(props: { status: string }) {
  const { status } = props
  const { t } = useTranslation()

  switch (status) {
    case "success":
      return (
        <span className="inline-flex items-center gap-1 rounded bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-3.5 w-3.5" /> {t.common.success}
        </span>
      )
    case "reverted":
      return (
        <span className="inline-flex items-center gap-1 rounded bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
          <XCircle className="h-3.5 w-3.5" /> {t.common.reverted}
        </span>
      )
    case "pending":
      return (
        <span className="inline-flex items-center gap-1 rounded bg-yellow-500/15 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:text-yellow-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t.common.pending}
        </span>
      )
    default:
      return (
        <span className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium">
          <HelpCircle className="h-3.5 w-3.5" /> {status}
        </span>
      )
  }
}
