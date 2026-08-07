import { createRootRoute, Outlet } from "@tanstack/react-router"

import { GeneralError } from "@/features/errors/general-error"
import { NotFoundError } from "@/features/errors/not-found-error"
import { Providers } from "@/providers/app-providers"

/**
 * The error surfaces are wired here, not only exposed at `/404` and `/500`.
 * Those routes exist so the pages can be reviewed directly; these two handlers
 * are what an actual unmatched URL or uncaught render error reaches.
 *
 * Both render inside `Providers`, so they still have i18n and can be translated
 * like the rest of the application.
 */
export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
})

function RootLayout() {
  return (
    <Providers>
      <Outlet />
    </Providers>
  )
}
