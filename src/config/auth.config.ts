import { createAuthError } from "@/features/auth/domain/auth-error"

/**
 * What goes into the SIWE message that the user signs.
 *
 * `domain` and `uri` are intentionally **not** taken from env and not override: according to
 * EIP-4361 they must properly describe the place that is requesting the signature, which that place is
 * origin of the page. Allowing overrides doesn't make configuration more flexible — it's open
 * way for a page to sign a message declaring a domain different from the actual domain, which is correct
 * The anti-phishing part of the protocol wants to prevent it.
 *
 * Taking it straight from `window.location` also makes any validation format redundant:
 * `host` never contains a scheme or path, `origin` is always an absolute URI.
 */
export type AuthConfig = {
  siweDomain: string
  siweUri: string
  siweStatement: string
}

/**
 * Statement is **signed content**, so it is a constant and not in i18n:
 * it must be identical every session and match what the backend expects. Change accordingly
 * The interface language will do the same action creating two different messages.
 */
const SIWE_STATEMENT =
  "Sign in with your Ethereum wallet. This signature creates no transaction and costs no gas."

export function getAuthConfig(): AuthConfig {
  if (typeof window === "undefined") {
    throw createAuthError(
      "AUTH_UNAVAILABLE",
      "SIWE configuration is only available in the browser.",
    )
  }

  return {
    siweDomain: window.location.host,
    siweUri: window.location.origin,
    siweStatement: SIWE_STATEMENT,
  }
}
