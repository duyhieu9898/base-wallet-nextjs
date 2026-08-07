import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useTranslation } from "@/i18n/use-translation"
import { SignInWithWallet } from "./sign-in-with-wallet"

/**
 * Application's login status.
 *
 * Show "logged in" only when the auth state is `authenticated` — i.e. the backend
 * returned a valid session. The connecting wallet is not proof of login.
 */
export function AuthStatus() {
  const { t } = useTranslation()
  const { state, logout, isLoggingOut, logoutError } = useAuth()

  if (state.status === "authenticated") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t.auth.signedInTitle}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3 text-sm">
          <dl className="space-y-2">
            <div>
              <dt className="text-muted-foreground">{t.auth.sessionWallet}</dt>
              <dd className="font-mono break-all">
                {state.user.walletAddress}
              </dd>
            </div>

            {state.user.memberCode && (
              <div>
                <dt className="text-muted-foreground">Member Code</dt>
                <dd className="font-mono">{state.user.memberCode}</dd>
              </div>
            )}
          </dl>

          {logoutError && (
            <p className="text-destructive text-sm" role="alert">
              {logoutError.message}
            </p>
          )}

          <Button
            className="w-full"
            disabled={isLoggingOut}
            onClick={() => {
              void logout()
            }}
          >
            {isLoggingOut ? t.auth.loggingOut : t.auth.logout}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t.auth.signInTitle}</CardTitle>
      </CardHeader>

      <CardContent>
        <SignInWithWallet />
      </CardContent>
    </Card>
  )
}
