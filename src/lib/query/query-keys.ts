/**
 * The root for all queries is tied to the **backend identity** of the currently logged in user.
 *
 * Grouping them under one root allows logout to be cleaned up with a single filter,
 * Instead of having the auth feature list the names of each business feature — that list is solid
 * will definitely be outdated and leave out private data.
 *
 * Here's the **contract**: whichever feature has data paid by the backend per session?
 * Place your own query key under this root, for example:
 *
 * ```ts
 * const notificationsKey = [...queryKeys.userScoped.all, "notifications"] as const
 * ```
 *
 * Intentionally not declaring keys for features that do not exist yet: keys are not available
 * consumer is dead code, and it falsely suggests that the capability is ready.
 *
 * DO NOT place under this root: public data, on-chain data readable by anyone
 * ai, and Wagmi's query key (see notes at the end of the file).
 */
const userScopedRoot = ["user-scoped"] as const

export const queryKeys = {
  userScoped: {
    all: userScopedRoot,
  },
}

/**
 * Note: onchain data (balance / allowance / receipt) is owned by Wagmi and
 * Use Wagmi's own query key. Invalidating them is foundation-owned: the public
 * write hooks in `@/web3/evm` already do targeted invalidation after a receipt.
 * Application code must not build those filters itself — the self-defined key
 * here will never match Wagmi's query.
 *
 * That also means logout can't accidentally clear Wagmi's cache
 * `queryKeys.userScoped.all`.
 */
