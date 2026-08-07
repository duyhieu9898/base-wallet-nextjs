export type AccessTokenSnapshot = {
  token: string
  /** Epoch milliseconds. */
  expiresAt: number
}

export type AccessTokenStore = {
  get(): AccessTokenSnapshot | null
  set(snapshot: AccessTokenSnapshot): void
  clear(): void
}

/**
 * Access token store is only in memory.
 *
 * Deliberately DO NOT use module-level singleton: on the server a singleton will fail
 * shared between requests and leaking one user's token to another
 * other use. Each provider tree (and each test) creates its own instance via the factory.
 *
 * Store does not persist, does not serialize, does not log. Tokens never pass through
 * Public React context, props or query cache — only private runtime service
 * new keeps reference to store.
 */
export function createAccessTokenStore(): AccessTokenStore {
  let snapshot: AccessTokenSnapshot | null = null

  return {
    get() {
      return snapshot
    },

    set(next) {
      if (next.token === "") {
        throw new Error("Access token must not be empty.")
      }

      // Monolithic replacement: there is no intermediate state that the new token has
      // recorded but the expiry still remains of the old token.
      snapshot = { token: next.token, expiresAt: next.expiresAt }
    },

    clear() {
      snapshot = null
    },
  }
}

/**
 * Converts `expiresIn` (seconds from now) to an epoch-ms snapshot.
 *
 * Used by both `SiweVerifyAuthenticated` and `UserAuthResponse` payloads.
 */
export function toAccessTokenSnapshot(payload: {
  accessToken: string
  expiresIn: number
}): AccessTokenSnapshot {
  return {
    token: payload.accessToken,
    expiresAt: Date.now() + payload.expiresIn * 1000,
  }
}
