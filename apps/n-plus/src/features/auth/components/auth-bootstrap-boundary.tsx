import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useTranslation } from "@/i18n/use-translation"

export type AuthBootstrapBoundaryProps = {
  children: ReactNode
}

/**
 * Block the application until the session has concluded.
 *
 * While `bootstrapping` does not render login UI: shows "not logged in"
 * Before asking, the backend is lying to the user, and will flash the status
 * logged in shortly after.
 *
 * `unavailable` also does not render the login UI for the same reason — it is "unverified."
 * okay", not "logged out".
 */
export function AuthBootstrapBoundary({
  children,
}: AuthBootstrapBoundaryProps) {
  const { t } = useTranslation()
  const { state, retryBootstrap } = useAuth()

  if (state.status === "bootstrapping") {
    return (
      <div
        className="text-muted-foreground flex min-h-screen items-center justify-center text-sm"
        role="status"
      >
        {t.auth.bootstrapping}
      </div>
    )
  }

  if (state.status === "unavailable") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="space-y-2">
          <h1 className="text-lg font-semibold">{t.auth.unavailableTitle}</h1>

          <p className="text-muted-foreground max-w-md text-sm">
            {state.error.message} {t.auth.unavailableHint}
          </p>
        </div>

        <Button
          onClick={() => {
            void retryBootstrap()
          }}
        >
          {t.auth.retry}
        </Button>
      </div>
    )
  }

  return children
}
