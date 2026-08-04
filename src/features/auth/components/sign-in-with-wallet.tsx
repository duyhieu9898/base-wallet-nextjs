"use client"

import { Button } from "@/components/ui/button"
import { useSiweLogin } from "@/features/auth/hooks/use-siwe-login"
import { useTranslation } from "@/i18n/use-translation"
import { useEvmSelection } from "@/web3/evm/selection/use-evm-selection"

/**
 * Wallet login button.
 *
 * Intentionally NOT rendering the wallet connection UI: `WalletPanel` already owns the connector list,
 * network switching and disconnection. Duplicating that stream creates two sources of truth
 * about wallet status on the same page.
 */
export function SignInWithWallet() {
  const { t } = useTranslation()
  const selection = useEvmSelection()
  const { signIn, canSignIn, isPending, error } = useSiweLogin()

  const requirement = (() => {
    switch (selection.status) {
      case "disconnected":
        return t.auth.connectWalletFirst
      case "connecting":
        return t.auth.walletConnecting
      case "unsupported":
        return t.auth.unsupportedNetworkPrompt
      case "ready":
        return null
    }
  })()

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">
        {t.auth.signInDescription}
      </p>

      {requirement && <p className="text-sm">{requirement}</p>}

      <Button
        className="w-full"
        disabled={!canSignIn}
        onClick={() => {
          void signIn()
        }}
      >
        {isPending ? t.auth.signingIn : t.auth.signInButton}
      </Button>

      {/* Only normalized messages — never render raw payload,
          signature hay access token. */}
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error.message}
        </p>
      )}
    </div>
  )
}
