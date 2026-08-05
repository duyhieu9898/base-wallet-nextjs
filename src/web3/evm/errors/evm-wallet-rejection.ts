import { BaseError, UserRejectedRequestError } from "viem"

/**
 * Whether the user clicks decline in the wallet or not.
 *
 * This is the semantic error of **wallet**, so it belongs to the EVM foundation and not
 * Which feature? Previously, transaction flow and auth flow each detected its own type;
 * Two implementations of the same question will inevitably drift apart.
 *
 * Rejection is detected through three ways, because depending on the connector, the error comes in a different form
 * nhau:
 *
 * 1. viem wraps to `UserRejectedRequestError`, possibly deep in the chain
 *    `cause` of a `BaseError` — must use `walk()`.
 * 2. Provider returns the EIP-1193 object directly with `code: 4001`, without passing it through.
 * 3. Error has been wrapped by another class but the cause is still kept in `cause`.
 */
export function isUserRejectedWalletRequest(cause: unknown): boolean {
  if (cause instanceof BaseError) {
    if (cause.walk((error) => error instanceof UserRejectedRequestError)) {
      return true
    }
  }

  return hasRejectionShape(cause)
}

/** Maximum number of recursive loops when following `cause` — block the loop error chain. */
const MAX_CAUSE_DEPTH = 10

function hasRejectionShape(cause: unknown, depth = 0): boolean {
  if (typeof cause !== "object" || cause === null || depth > MAX_CAUSE_DEPTH) {
    return false
  }

  const candidate = cause as {
    name?: unknown
    code?: unknown
    cause?: unknown
  }

  if (candidate.name === "UserRejectedRequestError") {
    return true
  }

  // EIP-1193: 4001 = "User rejected the request".
  if (candidate.code === 4001) {
    return true
  }

  return candidate.cause === undefined || candidate.cause === cause
    ? false
    : hasRejectionShape(candidate.cause, depth + 1)
}
