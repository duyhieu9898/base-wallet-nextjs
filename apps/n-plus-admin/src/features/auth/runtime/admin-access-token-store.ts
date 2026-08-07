export type AdminAccessTokenSnapshot = {
  token: string
  expiresAt: number
}

export type AdminAccessTokenStore = {
  get(): AdminAccessTokenSnapshot | null
  set(snapshot: AdminAccessTokenSnapshot): void
  clear(): void
}

export function createAdminAccessTokenStore(): AdminAccessTokenStore {
  let snapshot: AdminAccessTokenSnapshot | null = null

  return {
    get() {
      return snapshot
    },
    set(next) {
      if (!next.token) {
        throw new Error("Access token cannot be empty.")
      }

      snapshot = { token: next.token, expiresAt: next.expiresAt }
    },
    clear() {
      snapshot = null
    },
  }
}

export function toAdminAccessTokenSnapshot(payload: {
  accessToken: string
  expiresIn: number
}): AdminAccessTokenSnapshot {
  return {
    token: payload.accessToken,
    expiresAt: Date.now() + payload.expiresIn * 1000,
  }
}
