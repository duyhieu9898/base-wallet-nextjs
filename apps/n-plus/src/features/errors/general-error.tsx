import { useNavigate, useRouter } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { useTranslation } from "@/i18n/use-translation"
import { cn } from "@/lib/utils"

type GeneralErrorProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Drops the status code and the actions, for use inside a smaller surface. */
  minimal?: boolean
}

export function GeneralError({
  className,
  minimal = false,
}: GeneralErrorProps) {
  const router = useRouter()
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className={cn("h-svh w-full", className)}>
      <div className="m-auto flex h-full w-full flex-col items-center justify-center gap-2">
        {!minimal && (
          <h1 className="text-[7rem] leading-tight font-bold">500</h1>
        )}
        <span className="font-medium">{t.errorPages.general.title}</span>
        <p className="text-muted-foreground text-center">
          {t.errorPages.general.description}
        </p>
        {!minimal && (
          <div className="mt-6 flex gap-4">
            <Button variant="outline" onClick={() => router.history.back()}>
              {t.errorPages.goBack}
            </Button>
            <Button onClick={() => void navigate({ to: "/" })}>
              {t.errorPages.backToHome}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
