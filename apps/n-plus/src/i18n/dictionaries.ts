import "server-only"

import type { Locale } from "@/i18n/config"
import enDictionary from "@/i18n/dictionaries/en.json"

export type Dictionary = typeof enDictionary

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () =>
    import("@/i18n/dictionaries/en.json").then((module) => module.default),
  ja: () =>
    import("@/i18n/dictionaries/ja.json").then((module) => module.default),
}

export const getDictionary = async (locale: Locale): Promise<Dictionary> => {
  const loader = dictionaries[locale] ?? dictionaries.en
  return loader()
}
