import { Web3Lab } from "@/components/web3/web3-lab"
import { LanguageSwitcher } from "@/i18n/language-switcher"

/**
 * Development-only. The production gate is on the route (`src/routes/web3-lab.tsx`)
 * so this module is never reached, and never bundled, in a production build.
 */
export default function Web3LabPage() {
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
