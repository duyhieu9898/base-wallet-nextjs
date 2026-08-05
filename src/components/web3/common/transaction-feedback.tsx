"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  CheckCircle2,
  CircleAlert,
  CircleX,
  ExternalLink,
  Loader2,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import type { Dictionary } from "@/i18n/dictionaries"
import { useTranslation } from "@/i18n/use-translation"
import { cn } from "@/lib/utils"
import { type EvmWriteStatus } from "@/web3/evm"
const MAX_VISIBLE_NOTIFICATIONS = 2
const SUCCESS_DISMISS_DELAY_MS = 5_000
const REJECTED_DISMISS_DELAY_MS = 3_000

export type TransactionFeedbackPhase =
  | "awaiting-signature"
  | "confirming"
  | "success"
  | "reverted"
  | "rejected"
  | "receipt-error"
  | "error"

type TransactionNotification = Readonly<{
  id: string
  title: string
  phase: TransactionFeedbackPhase
  hash?: string
  explorerUrl?: string
  errorMessage?: string
}>

type StartTransactionFeedbackInput = Readonly<{
  title: string
}>

type UpdateTransactionFeedbackInput = Readonly<{
  id: string
  phase: TransactionFeedbackPhase
  hash?: string
  explorerUrl?: string
  errorMessage?: string
}>

type TransactionFeedbackContextValue = Readonly<{
  begin(input: StartTransactionFeedbackInput): string
  update(input: UpdateTransactionFeedbackInput): void
  dismiss(id: string): void
}>

const TransactionFeedbackContext =
  createContext<TransactionFeedbackContextValue | null>(null)

function getAutoDismissDelay(phase: TransactionFeedbackPhase) {
  if (phase === "success") return SUCCESS_DISMISS_DELAY_MS
  if (phase === "rejected") return REJECTED_DISMISS_DELAY_MS
  return null
}

function getPhaseContent(notification: TransactionNotification, t: Dictionary) {
  switch (notification.phase) {
    case "awaiting-signature":
      return {
        label: t.feedback.awaitingSignature,
        icon: <Loader2 className="size-10 animate-spin" aria-hidden="true" />,
        className: "text-foreground",
      }
    case "confirming":
      return {
        label: t.feedback.confirming,
        icon: <Loader2 className="size-10 animate-spin" aria-hidden="true" />,
        className: "text-foreground",
      }
    case "success":
      return {
        label: t.feedback.success,
        icon: <CheckCircle2 className="size-10" aria-hidden="true" />,
        className: "text-green-700 dark:text-green-400",
      }
    case "reverted":
      return {
        label: t.feedback.reverted,
        icon: <CircleX className="size-10" aria-hidden="true" />,
        className: "text-destructive",
      }
    case "rejected":
      return {
        label: t.feedback.rejected,
        icon: <CircleAlert className="size-10" aria-hidden="true" />,
        className: "text-muted-foreground",
      }
    case "receipt-error":
      return {
        label: t.feedback.receiptError,
        icon: <CircleAlert className="size-10" aria-hidden="true" />,
        className: "text-destructive",
      }
    case "error":
      return {
        label: t.feedback.error,
        icon: <CircleAlert className="size-10" aria-hidden="true" />,
        className: "text-destructive",
      }
  }
}

function TransactionFeedbackItem(props: {
  notification: TransactionNotification
  onDismiss(id: string): void
}) {
  const { notification, onDismiss } = props
  const { t } = useTranslation()
  const autoDismissDelay = getAutoDismissDelay(notification.phase)
  const content = getPhaseContent(notification, t)

  useEffect(() => {
    if (autoDismissDelay === null) return

    const timeout = window.setTimeout(
      () => onDismiss(notification.id),
      autoDismissDelay,
    )
    return () => window.clearTimeout(timeout)
  }, [autoDismissDelay, notification.id, onDismiss])

  return (
    <section className="bg-card text-card-foreground ring-foreground/10 w-84 rounded-lg p-3.5 shadow-lg ring-1 sm:w-96">
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 shrink-0", content.className)}>
          {content.icon}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-base font-semibold">{content.label}</p>
          <p className="text-muted-foreground truncate text-sm">
            {notification.title}
          </p>
          {notification.errorMessage ? (
            <p className="text-destructive line-clamp-2 text-sm">
              {notification.errorMessage}
            </p>
          ) : null}
          {notification.explorerUrl ? (
            <a
              className="text-primary inline-flex items-center gap-1 text-sm font-medium underline underline-offset-2"
              href={notification.explorerUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              {t.feedback.viewInExplorer}{" "}
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          ) : null}
        </div>
        <Button
          aria-label={t.feedback.dismiss}
          className="-mt-1 -mr-1 shrink-0"
          size="icon-sm"
          variant="ghost"
          onClick={() => onDismiss(notification.id)}
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </section>
  )
}

function TransactionFeedbackViewport(props: {
  notifications: readonly TransactionNotification[]
  onDismiss(id: string): void
}) {
  return (
    <div
      aria-live="polite"
      aria-relevant="additions text"
      className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-84 flex-col gap-2.5 sm:right-6 sm:bottom-6 sm:w-96"
    >
      {props.notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <TransactionFeedbackItem
            notification={notification}
            onDismiss={props.onDismiss}
          />
        </div>
      ))}
    </div>
  )
}

export function TransactionFeedbackProvider(props: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<
    readonly TransactionNotification[]
  >([])
  const sequence = useRef(0)

  const dismiss = useCallback((id: string) => {
    setNotifications((current) =>
      current.filter((notification) => notification.id !== id),
    )
  }, [])

  const value = useMemo<TransactionFeedbackContextValue>(
    () => ({
      begin(input) {
        const id = `transaction-${Date.now()}-${++sequence.current}`
        const notification: TransactionNotification = {
          id,
          title: input.title,
          phase: "awaiting-signature",
        }
        setNotifications((current) =>
          [notification, ...current].slice(0, MAX_VISIBLE_NOTIFICATIONS),
        )
        return id
      },
      update(input) {
        setNotifications((current) =>
          current.map((notification) =>
            notification.id === input.id
              ? {
                  ...notification,
                  phase: input.phase,
                  hash: input.hash,
                  explorerUrl: input.explorerUrl,
                  errorMessage: input.errorMessage,
                }
              : notification,
          ),
        )
      },
      dismiss,
    }),
    [dismiss],
  )

  return (
    <TransactionFeedbackContext.Provider value={value}>
      {props.children}
      <TransactionFeedbackViewport
        notifications={notifications}
        onDismiss={dismiss}
      />
    </TransactionFeedbackContext.Provider>
  )
}

export function useTransactionFeedbackController() {
  const context = useContext(TransactionFeedbackContext)
  if (!context) {
    throw new Error(
      "useTransactionFeedbackController must be used inside TransactionFeedbackProvider.",
    )
  }
  return context
}

type UseTransactionFeedbackInput = Readonly<{
  title: string
  status: EvmWriteStatus | TransactionFeedbackPhase
  hash: string | null
  error?: { message: string } | null
  getExplorerUrl?(hash: string): string
}>

/**
 * Connects a feature's write lifecycle to one mutable notification. It deliberately
 * does not own receipt state; the write hook remains the source of truth.
 */
export function useTransactionFeedback(input: UseTransactionFeedbackInput) {
  const feedback = useTransactionFeedbackController()
  const notificationId = useRef<string | null>(null)
  const lastStatus = useRef<string | null>(null)

  const begin = useCallback(() => {
    const id = feedback.begin({ title: input.title })
    notificationId.current = id
    lastStatus.current = null
  }, [feedback, input.title])

  useEffect(() => {
    const id = notificationId.current
    if (!id || lastStatus.current === input.status) return

    lastStatus.current = input.status
    const explorerUrl = input.hash
      ? input.getExplorerUrl?.(input.hash)
      : undefined

    switch (input.status) {
      case "awaiting-signature":
      case "confirming":
      case "success":
      case "reverted":
      case "rejected":
        feedback.update({
          id,
          phase: input.status,
          hash: input.hash ?? undefined,
          explorerUrl,
        })
        return
      case "error":
        feedback.update({
          id,
          phase: input.hash ? "receipt-error" : "error",
          hash: input.hash ?? undefined,
          explorerUrl,
          errorMessage: input.error?.message,
        })
    }
  }, [feedback, input])

  return { begin }
}
