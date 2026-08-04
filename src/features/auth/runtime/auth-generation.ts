export type AuthGeneration = {
  /** Generation is in effect. Operation captures this value when started. */
  current(): number
  /** Start a new generation; All old operations become stale. */
  next(): number
  isCurrent(generation: number): boolean
}

/**
 * Anti-"late results" counter.
 *
 * Auth has many async operations running in parallel (bootstrap refresh, login, one
 * refresh triggered by 401, logout). Without this counter:
 *
 * - a refresh that is flying when the user presses logout will return afterwards and **login
 *   re** the user has just actively logged out;
 * - A verification from wallet A returned after the user has changed to wallet B will create a session
 *   Wrong wallet attached.
 *
 * Cannot be replaced with `AbortController`: at that point the request has already reached the backend
 * and the server-side session *has* been created. The problem is not canceling the request, but...
 * **ignore the results**.
 *
 * Convention: capture generation as soon as the operation starts, and check
 * `isCurrent()` right BEFORE any side effects — write token, change auth state, clear
 * query cache — not just once at the end.
 */
export function createAuthGeneration(): AuthGeneration {
  let generation = 0

  return {
    current() {
      return generation
    },

    next() {
      generation += 1

      return generation
    },

    isCurrent(candidate) {
      return candidate === generation
    },
  }
}
