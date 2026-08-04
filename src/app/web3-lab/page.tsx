import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { Web3Lab } from "@/components/web3/web3-lab"
import { LanguageSwitcher } from "@/i18n/language-switcher"

export const metadata: Metadata = {
  title: "Web3 Lab",
  description: "Onchain development lab for EVM networks.",
}

/**
 * Route dev-only. Gate equals `notFound()` in production (Next 16 removes `export const dynamic`,
 * Use `process.env.NODE_ENV` as the standard lever).
 */
export default function Web3LabPage() {
  if (process.env.NODE_ENV === "production") {
    notFound()
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <div className="flex items-center justify-between">
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Web3 Lab</h1>

          <p className="text-muted-foreground text-sm">
            Onchain development lab — Real RPC, real native & ERC-20 balances,
            two-step transaction review with EIP-1559 gas preview and network
            safety warnings.
          </p>
        </header>
        <LanguageSwitcher />
      </div>

      <Web3Lab />
    </main>
  )
}
