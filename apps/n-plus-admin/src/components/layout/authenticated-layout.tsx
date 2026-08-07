import { useEffect, type ReactNode } from "react"
import { useLocation, useNavigate } from "@tanstack/react-router"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { Header } from "@/components/layout/header"
import { SkipToMain } from "@/components/skip-to-main"
import { ThemeSwitch } from "@/components/theme-switch"
import { ExplorerChainProvider } from "@/components/web3/explorer-chain-context"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { LayoutProvider } from "@/context/layout-provider"
import { ensureEvmRuntimeConfigured, web3Config } from "@/config/web3.config"
import { useTheme } from "@/context/theme-provider"
import { useAdminAuth } from "@/features/auth/runtime/admin-auth-context"
import { cn } from "@/lib/utils"

type AdminShellProps = {
  children: ReactNode
  /**
   * Sidebar open state read from the cookie by the root route before first
   * paint, so the rail matches what the operator left open instead of flashing
   * the default.
   */
  defaultSidebarOpen?: boolean
}

// Registry selectors read a module-scoped config, so it must be installed before
// the first cell renders. This app mounts no EvmProvider to do it.
ensureEvmRuntimeConfigured()

export function AdminShell({
  children,
  defaultSidebarOpen = true,
}: AdminShellProps) {
  const navigate = useNavigate()
  const pathname = useLocation({ select: (s) => s.pathname })
  const { theme, setTheme } = useTheme()

  let authState = { status: "authenticated" }
  try {
    const auth = useAdminAuth()
    authState = auth.state
  } catch {
    // Fallback for tests mounted outside AdminAuthProvider
  }

  const isLoginPage = pathname === "/login"

  useEffect(() => {
    if (isLoginPage) {
      if (authState.status === "authenticated") {
        void navigate({ to: "/" })
      }
    } else {
      if (
        authState.status === "unauthenticated" ||
        authState.status === "2fa_required"
      ) {
        void navigate({ to: "/login" })
      }
    }
  }, [authState.status, isLoginPage, navigate])

  // Login page layout: render standalone without sidebar frame
  if (isLoginPage) {
    return <>{children}</>
  }

  // Bootstrapping session state
  if (authState.status === "bootstrapping") {
    return (
      <div className="bg-background flex h-screen w-full items-center justify-center">
        <div className="space-y-2 text-center">
          <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-muted-foreground font-mono text-xs">
            Authenticating session...
          </p>
        </div>
      </div>
    )
  }

  // Unauthenticated on protected route (redirecting to /login)
  if (
    authState.status === "unauthenticated" ||
    authState.status === "2fa_required"
  ) {
    return null
  }

  return (
    <LayoutProvider>
      <ExplorerChainProvider chainId={web3Config.chainId}>
        <SidebarProvider defaultOpen={defaultSidebarOpen}>
          <SkipToMain />
          <AppSidebar />
          <SidebarInset
            className={cn(
              // Content container, so children can use container queries
              "@container/content",
              // Fixed layout pins the height so the page does not overflow
              "has-data-[layout=fixed]:h-svh",
              "peer-data-[variant=inset]:has-data-[layout=fixed]:h-[calc(100svh-(var(--spacing)*4))]",
            )}
          >
            {/*
            One header for every authenticated route.
            It was previously repeated verbatim in all eleven pages, which meant
            the sidebar trigger and theme toggle could drift apart page by page,
            and adding anything to the header meant eleven edits. `fixed` is now
            uniform: six pages had it and five did not, with nothing in the
            layout depending on the difference.
          */}
            <Header fixed>
              <div className="ms-auto flex items-center gap-2">
                <ThemeSwitch theme={theme} onThemeChange={setTheme} />
              </div>
            </Header>

            {children}
          </SidebarInset>
        </SidebarProvider>
      </ExplorerChainProvider>
    </LayoutProvider>
  )
}
