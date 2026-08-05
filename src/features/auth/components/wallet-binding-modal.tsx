"use client"

import { Dialog } from "@base-ui/react/dialog"

import { Button } from "@/components/ui/button"
import { truncateAddress } from "@/web3/evm"
import type { WalletBinding } from "@/features/auth/domain/wallet-binding"
import { useTranslation } from "@/i18n/use-translation"
import { cn } from "@/lib/utils"

export type WalletBindingModalProps = {
  binding: Extract<
    WalletBinding,
    { status: "wallet-mismatched" } | { status: "wallet-disconnected" }
  >
  onLogout(): void
  isLoggingOut: boolean
  logoutErrorMessage?: string | null
}

/**
 * Blocking modal when the wallet being connected does not match the session.
 *
 * Modal intentionally has NO escape route:
 * - `open` is always `true`, `onOpenChange` is ignored;
 * - Escape and clicking out are blocked;
 * - no close button, no "continue".
 *
 * Reason: session is tied to a specific wallet address. Allows use of application with
 * another wallet means wallet A's actions are performed under the wallet's identity
 * B. There are only two valid exits — switch back to the correct wallet, or log out.
 *
 * Modal is just presentation. The real guard is `assertAuthenticatedWalletBinding()`;
 * xem `use-authenticated-wallet.ts`.
 */
export function WalletBindingModal({
  binding,
  onLogout,
  isLoggingOut,
  logoutErrorMessage,
}: WalletBindingModalProps) {
  const { t } = useTranslation()
  const isMismatch = binding.status === "wallet-mismatched"
  const sessionAddress = truncateAddress(binding.sessionAddress)

  return (
    <Dialog.Root
      open
      modal
      disablePointerDismissal
      onOpenChange={(_open, eventDetails) => {
        // Block all Base UI closing mechanisms (Escape, focus out, close watcher).
        // `open` is a constant so the state cannot be changed from here.
        eventDetails.cancel()
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60" />

        <Dialog.Popup
          // Base UI locks external interactions with `inert`, not set
          // `aria-modal`. Put more here for the old screen reader — which only understands
          // `aria-modal` — also cannot read the text behind.
          aria-modal="true"
          className={cn(
            "bg-background fixed top-1/2 left-1/2 z-50 w-[min(28rem,calc(100vw-2rem))]",
            "-translate-x-1/2 -translate-y-1/2 rounded-lg border p-6 shadow-lg",
          )}
        >
          <Dialog.Title className="text-base font-semibold">
            {isMismatch ? t.auth.mismatchTitle : t.auth.disconnectedTitle}
          </Dialog.Title>

          <Dialog.Description className="text-muted-foreground mt-2 text-sm">
            {isMismatch
              ? t.auth.mismatchDescription
              : t.auth.disconnectedDescription}
          </Dialog.Description>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">{t.auth.sessionWallet}</dt>
              <dd className="font-mono" data-testid="session-address">
                {sessionAddress}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">
                {t.auth.connectedWallet}
              </dt>
              <dd className="font-mono" data-testid="connected-address">
                {isMismatch
                  ? truncateAddress(binding.connectedAddress)
                  : t.auth.notConnected}
              </dd>
            </div>
          </dl>

          {logoutErrorMessage && (
            <p className="text-destructive mt-4 text-sm" role="alert">
              {logoutErrorMessage}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <p className="text-muted-foreground text-sm">
              {t.auth.switchHint.replace("{address}", sessionAddress)}
            </p>

            <Button
              variant="outline"
              disabled={isLoggingOut}
              onClick={onLogout}
            >
              {isLoggingOut ? t.auth.loggingOut : t.auth.logout}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
