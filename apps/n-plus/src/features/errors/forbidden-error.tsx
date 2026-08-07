import { useNavigate, useRouter } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { useTranslation } from "@/i18n/use-translation"

export function ForbiddenError() {
  const router = useRouter()
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className="h-svh">
      <div className="m-auto flex h-full w-full flex-col items-center justify-center gap-2">
        <h1 className="text-[7rem] leading-tight font-bold">403</h1>
        <span className="font-medium">{t.errorPages.forbidden.title}</span>
        <p className="text-muted-foreground text-center">
          {t.errorPages.forbidden.description}
        </p>
        <div className="mt-6 flex gap-4">
          <Button variant="outline" onClick={() => router.history.back()}>
            {t.errorPages.goBack}
          </Button>
          <Button onClick={() => void navigate({ to: "/" })}>
            {t.errorPages.backToHome}
          </Button>
        </div>
      </div>
    </div>
  )
}
