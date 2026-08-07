import type { Metadata } from "next"
import type { ReactNode } from "react"

import { Providers } from "@/app/providers"

import "./globals.css"

export const metadata: Metadata = {
  title: "Web3 Foundation",
  description:
    "Production-oriented Web3 frontend foundation with an active EVM runtime.",
}

type RootLayoutProps = {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
