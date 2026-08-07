import { Button } from "@/components/ui/button"
import { useTranslation } from "@/i18n/use-translation"

/**
 * Generic HTTP 503 surface.
 *
 * This is **not** the product's Maintenance Page (screen A040000). That screen
 * is specified separately and needs a maintenance reason, message and content
 * from the backend, periodic status polling, manual refresh, and an automatic
 * redirect once maintenance ends. None of that belongs in a static error page —
 * do not grow this component into it.
 */
export function MaintenanceError() {
  const { t } = useTranslation()

  return (
    <div className="h-svh">
      <div className="m-auto flex h-full w-full flex-col items-center justify-center gap-2">
        <h1 className="text-[7rem] leading-tight font-bold">503</h1>
        <span className="font-medium">{t.errorPages.maintenance.title}</span>
        <p className="text-muted-foreground text-center">
          {t.errorPages.maintenance.description}
        </p>
        <div className="mt-6 flex gap-4">
          <Button variant="outline" onClick={() => window.location.reload()}>
            {t.errorPages.retry}
          </Button>
        </div>
      </div>
    </div>
  )
}
