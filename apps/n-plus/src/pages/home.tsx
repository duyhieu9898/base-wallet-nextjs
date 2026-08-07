import { Link } from "@tanstack/react-router"

import { WalletPanel } from "@/components/web3/wallet-panel"
import { AuthStatus } from "@/features/auth/components/auth-status"
import { LanguageSwitcher } from "@/i18n/language-switcher"
import { useTranslation } from "@/i18n/use-translation"

export default function HomePage() {
  const { t } = useTranslation()

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="flex w-full justify-end">
        <LanguageSwitcher />
      </div>

      <header className="space-y-2 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">
          {t.home.title}
        </h1>

        <p className="text-muted-foreground">{t.home.subtitle}</p>
      </header>

      <WalletPanel />

      {/* Auth is behind the wallet panel: logging in requires the wallet to be ready first. */}
      <AuthStatus />

      {process.env.NODE_ENV !== "production" && (
        <Link className="text-sm underline underline-offset-4" to="/web3-lab">
          {t.home.web3LabLink}
        </Link>
      )}
    </main>
  )
}
