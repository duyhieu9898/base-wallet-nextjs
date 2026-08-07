import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

import type { Locale } from "@/i18n/config"
import { defaultLocale, locales } from "@/i18n/config"
import enDict from "@/i18n/dictionaries/en.json"
import jaDict from "@/i18n/dictionaries/ja.json"
import type { Dictionary } from "@/i18n/dictionaries"

const STORAGE_KEY = "base-wallet:locale:v1"

const dictionaryMap: Record<Locale, Dictionary> = {
  en: enDict,
  ja: jaDict,
}

type I18nContextType = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Dictionary
}

const I18nContext = createContext<I18nContextType | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as Locale | null
      if (saved && locales.includes(saved)) {
        queueMicrotask(() => setLocaleState(saved))
      }
    } catch {
      // Keep default locale
    }
  }, [])

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale
    }
  }, [locale])

  const setLocale = (newLocale: Locale) => {
    if (!locales.includes(newLocale)) return
    setLocaleState(newLocale)
    try {
      window.localStorage.setItem(STORAGE_KEY, newLocale)
    } catch {
      // Safe fallback
    }
  }

  const dictionary = dictionaryMap[locale] ?? enDict

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: dictionary }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider")
  }
  return context
}
