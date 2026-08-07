import type { Metadata } from "next"
import { cookies } from "next/headers"
import { Inter } from "next/font/google"
import type { ReactNode } from "react"

import { AdminShell } from "@/components/layout/authenticated-layout"
import { DirectionProvider } from "@/context/direction-provider"
import { ThemeProvider } from "@/context/theme-provider"
import { AdminAuthProvider } from "@/features/auth/runtime/admin-auth-provider"
import { MockProvider } from "@/providers/mock-provider"
import { ThemedToaster } from "@/providers/themed-toaster"

import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "N+ Admin",
  description: "Operator console for the N+ System.",
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  // Read on the server so the sidebar renders in the state the user left it,
  // instead of mounting open and snapping shut on hydration.
  const cookieStore = await cookies()
  const defaultSidebarOpen = cookieStore.get("sidebar_state")?.value !== "false"

  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className={inter.className}>
        <MockProvider>
          <AdminAuthProvider>
            <ThemeProvider>
              <DirectionProvider>
                <AdminShell defaultSidebarOpen={defaultSidebarOpen}>
                  {children}
                </AdminShell>
                <ThemedToaster />
              </DirectionProvider>
            </ThemeProvider>
          </AdminAuthProvider>
        </MockProvider>
      </body>
    </html>
  )
}
