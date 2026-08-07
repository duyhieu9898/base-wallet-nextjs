import { Toaster } from "@/components/ui/sonner"
import { useTheme } from "@/context/theme-provider"

/**
 * Connects the presentational `Toaster` to this application's theme context.
 *
 * Exists because the root layout is a server component and cannot read the
 * context itself, and because the toaster must stay outside `AdminShell` so it
 * also renders on the login route.
 */
export function ThemedToaster() {
  const { theme } = useTheme()
  return <Toaster theme={theme} />
}
