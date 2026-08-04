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

/** Converts `accessTokenExpiresAt` ISO form of payload to epoch milliseconds. */
export function toAccessTokenSnapshot(payload: {
  accessToken: string
  accessTokenExpiresAt: string
}): AccessTokenSnapshot {
  const expiresAt = Date.parse(payload.accessTokenExpiresAt)

  return {
    token: payload.accessToken,
    // Timestamps that cannot be parsed are not allowed to damage the store. Looks like it's over
    // limit: the token can still be used for the next request, but is not considered valid
    // long lasting effect.
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : 0,
  }
}
