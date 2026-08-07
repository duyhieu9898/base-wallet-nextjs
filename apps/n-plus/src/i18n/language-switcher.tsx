import { Button } from "@/components/ui/button"
import type { Locale } from "@/i18n/config"
import { localeNames, locales } from "@/i18n/config"
import { useTranslation } from "@/i18n/use-translation"

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation()

  return (
    <div className="flex items-center gap-1 rounded-md border p-1 text-sm">
      {locales.map((loc: Locale) => (
        <Button
          key={loc}
          variant={locale === loc ? "default" : "ghost"}
          size="sm"
          className="h-7 px-2.5 text-sm"
          onClick={() => setLocale(loc)}
        >
          {localeNames[loc]}
        </Button>
      ))}
    </div>
  )
}
