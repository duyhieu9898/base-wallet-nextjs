import type { ReactNode } from "react"
import { Logo } from "@/assets/logo"
import { ThemeSwitch } from "@/components/theme-switch"
import { useTheme } from "@/context/theme-provider"

type AuthLayoutProps = {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { theme, setTheme } = useTheme()

  return (
    <div className="relative container grid h-svh max-w-none items-center justify-center">
      <div className="absolute top-4 right-4">
        <ThemeSwitch theme={theme} onThemeChange={setTheme} />
      </div>
      <div className="mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:p-8">
        <div className="mb-4 flex items-center justify-center">
          <Logo className="me-2" />
          <h1 className="text-xl font-medium">N+ Admin</h1>
        </div>
        {children}
      </div>
    </div>
  )
}
