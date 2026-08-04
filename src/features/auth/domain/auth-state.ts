import type { Address } from "viem"

import type { AuthError } from "./auth-error"
import type { AuthUser } from "./auth.schemas"

/**
 * Public runtime state of auth.
 *
 * Access token is NOT present here: this state passes through the React context and can be corrupted
 * read by any component. Tokens live in a private memory store.
 *
 * `unavailable` is intentionally separated from `unauthenticated`: backend no
 * The response is not proof that the user has logged out.
 */
export type AuthState =
  | { status: "bootstrapping" }
  | { status: "unauthenticated" }
  | { status: "authenticating"; walletAddress: Address }
  | { status: "authenticated"; user: AuthUser; accessTokenExpiresAt: string }
  | { status: "unavailable"; error: AuthError }

export type AuthStatus = AuthState["status"]

/**
 * The event causes the auth state to change state.
 *
 * Names are based on **what happened**, not on the target state: same state
 * The destination state can come from many reasons, and the transition table below is just that
 * where to decide which causes are acceptable.
 */
export type AuthEvent =
  /** Start (or retry) asking the backend if there is a session. */
  | { type: "bootstrap-started" }
  /** Backend validates a valid session — from bootstrap, refresh or login. */
  | {
      type: "session-established"
      user: AuthUser
      accessTokenExpiresAt: string
    }
  /** Backend clearly states there is no valid session. Terminal proof. */
  | { type: "session-rejected" }
  /** Unable to contact backend. NOT proof of being logged out. */
  | { type: "session-unverifiable"; error: AuthError }
  | { type: "login-started"; walletAddress: Address }
  | { type: "login-failed" }
  | { type: "logged-out" }

function authenticated(event: {
  user: AuthUser
  accessTokenExpiresAt: string
}): AuthState {
  return {
    status: "authenticated",
    user: event.user,
    accessTokenExpiresAt: event.accessTokenExpiresAt,
  }
}

/**
 * Auth's unique transition table.
 *
 * Pure reducer instead of scattered `setState`: valid transition readable at one
 * place, and can be tested without rendering.
 *
 * Invalid events with current state are **ignored** (return old state)
 * not throw — they come from the async race, not from programming errors. Two
 * most important skips:
 *
 * - `session-unverifiable` while `authenticated`: once backend flickered
 *   It is not allowed to kick users out of running sessions.
 * - `login-started` when not `unauthenticated`: do not open the signing stream without knowing it
 *   whether there is a session (`bootstrapping`), and do not oversign an existing session.
 */
export function authReducer(state: AuthState, event: AuthEvent): AuthState {
  switch (state.status) {
    case "bootstrapping":
      switch (event.type) {
        case "session-established":
          return authenticated(event)
        case "session-rejected":
          return { status: "unauthenticated" }
        case "session-unverifiable":
          return { status: "unavailable", error: event.error }
        default:
          return state
      }

    case "unauthenticated":
      switch (event.type) {
        case "bootstrap-started":
          return { status: "bootstrapping" }
        case "login-started":
          return {
            status: "authenticating",
            walletAddress: event.walletAddress,
          }
        // A protected request can successfully refresh and restore the session
        // without re-signing.
        case "session-established":
          return authenticated(event)
        default:
          return state
      }

    case "authenticating":
      switch (event.type) {
        case "session-established":
          return authenticated(event)
        case "login-failed":
        case "logged-out":
          return { status: "unauthenticated" }
        // `session-rejected` is ignored: a background refresh was not rejected
        // cancel the signing flow the user is working on.
        default:
          return state
      }

    case "authenticated":
      switch (event.type) {
        // Refresh token rotation: update term and user, still at `authenticated`.
        case "session-established":
          return authenticated(event)
        case "session-rejected":
        case "logged-out":
          return { status: "unauthenticated" }
        default:
          return state
      }

    case "unavailable":
      switch (event.type) {
        case "bootstrap-started":
          return { status: "bootstrapping" }
        case "session-established":
          return authenticated(event)
        case "session-rejected":
          return { status: "unauthenticated" }
        // `login-started` ignored: cannot log in without contact
        // backend.
        default:
          return state
      }
  }
}

/**
 * Auth always starts by asking the backend. There is no "auth disabled" state:
 * This application always uses a wallet, so auth and Web3 always go together.
 */
export const initialAuthState: AuthState = { status: "bootstrapping" }

export function isAuthenticated(
  state: AuthState,
): state is Extract<AuthState, { status: "authenticated" }> {
  return state.status === "authenticated"
}

/**
 * True when the application has not yet concluded about the session.
 *
 * UI should not render login form at this time — shows "not logged in"
 * When you don't know, you're lying to users.
 */
export function isAuthResolving(state: AuthState): boolean {
  return state.status === "bootstrapping" || state.status === "authenticating"
}

/** True when allowed to start a new login flow. */
export function canStartLogin(state: AuthState): boolean {
  return state.status === "unauthenticated"
}
