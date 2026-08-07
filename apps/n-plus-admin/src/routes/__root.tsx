import { createRootRoute, Outlet } from "@tanstack/react-router"

import { AdminShell } from "@/components/layout/authenticated-layout"
import { DirectionProvider } from "@/context/direction-provider"
import { ThemeProvider } from "@/context/theme-provider"
import { AdminAuthProvider } from "@/features/auth/runtime/admin-auth-provider"
import { GeneralError } from "@/features/errors/general-error"
import { NotFoundError } from "@/features/errors/not-found-error"
import { ThemedToaster } from "@/providers/themed-toaster"

/**
 * Read the sidebar cookie before first paint so the rail renders in the state
 * the operator left it, instead of mounting open and snapping shut. Previously
 * this was a server read via `next/headers`; in a static bundle there is no
 * server, and `document.cookie` is already available when the module evaluates.
 */
function readSidebarOpen(): boolean {
  if (typeof document === "undefined") return true

  const match = document.cookie.match(/(?:^|;\s*)sidebar_state=([^;]*)/)

  return match?.[1] !== "false"
}

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundError,
  // Replaces the App Router's app/error.tsx. Without it an uncaught render error
  // unmounts the tree and leaves a blank page instead of the 500 surface.
  errorComponent: GeneralError,
})

function RootLayout() {
  return (
    <AdminAuthProvider>
      <ThemeProvider>
        <DirectionProvider>
          <AdminShell defaultSidebarOpen={readSidebarOpen()}>
            <Outlet />
          </AdminShell>
          <ThemedToaster />
        </DirectionProvider>
      </ThemeProvider>
    </AdminAuthProvider>
  )
}
