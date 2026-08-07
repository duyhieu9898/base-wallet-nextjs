import type enDictionary from "@/i18n/dictionaries/en.json"

/**
 * Shape of a locale dictionary, derived from the English one so a missing key in
 * another locale is a type error.
 *
 * This module used to also export an async `getDictionary` loader marked
 * `server-only`, for App Router server components. There is no server and no
 * caller; `I18nProvider` imports both dictionaries directly.
 */
export type Dictionary = typeof enDictionary
