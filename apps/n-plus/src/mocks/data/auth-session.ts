import type { Address } from "viem"
import { privateKeyToAccount } from "viem/accounts"

/**
 * State of mock auth backend.
 *
 * Mock simulates **protocol behavior** (one-time nonce, refresh rotation, session
 * revocation) and not just return a hard success — otherwise, the test would pass anyway
 * frontend violates contract.
 *
 * The Verify handler performs the actual EIP-191 recovery (see `auth-handlers.ts`), so
 * mock can be used with real wallets when running dev, not just with test signatures.
 */

export type MockNonceRecord = {
  nonce: string
  walletAddress: Address
  chainId: number
  issuedAt: string
  expirationTime: string
  consumed: boolean
}

export type MockRefreshSession = {
  id: string
  userId: string
  walletAddress: Address
  /** Family to simulate reuse detection: reuse revoke the whole family. */
  familyId: string
  revoked: boolean
}

/** Error scenario injected into each endpoint to test terminal classification. */
export type MockAuthFailureMode =
  | "none"
  | "network-error"
  | "server-error"
  | "refresh-expired"
  | "refresh-revoked"
  | "refresh-reuse"

export type MockAuthState = {
  nonceRecords: Map<string, MockNonceRecord>
  refreshSessions: Map<string, MockRefreshSession>
  /** Replaces real HttpOnly cookie: JSDOM fails to simulate cookie flags. */
  currentRefreshCookieId: string | null
  accessTokenVersion: number
  nonceCounter: number
  sessionCounter: number
  failureModes: {
    nonce: MockAuthFailureMode
    verify: MockAuthFailureMode
    refresh: MockAuthFailureMode
    logout: MockAuthFailureMode
  }
  delays: {
    nonce: number
    verify: number
    refresh: number
    logout: number
  }
  registrationTickets: Map<string, { walletAddress: Address; used: boolean }>
  unregisteredWallets: Set<string>
  requestCounts: {
    nonce: number
    verify: number
    refresh: number
    logout: number
    /** Protected resource requests — used to prove replay exactly once. */
    protectedResource: number
  }
}

function createInitialState(): MockAuthState {
  return {
    nonceRecords: new Map(),
    refreshSessions: new Map(),
    registrationTickets: new Map(),
    unregisteredWallets: new Set(),
    currentRefreshCookieId: null,
    accessTokenVersion: 0,
    nonceCounter: 0,
    sessionCounter: 0,
    failureModes: {
      nonce: "none",
      verify: "none",
      refresh: "none",
      logout: "none",
    },
    delays: { nonce: 0, verify: 0, refresh: 0, logout: 0 },
    requestCounts: {
      nonce: 0,
      verify: 0,
      refresh: 0,
      logout: 0,
      protectedResource: 0,
    },
  }
}

export const mockAuthState: MockAuthState = createInitialState()

/**
 * Reset all mock auth state. Called in `afterEach` to test isolation:
 * A consumed nonce or a remaining failure mode will cause the test to fail
 * in a way that is very difficult to trace.
 */
export function resetMockAuthState(): void {
  const fresh = createInitialState()

  mockAuthState.nonceRecords = fresh.nonceRecords
  mockAuthState.refreshSessions = fresh.refreshSessions
  mockAuthState.registrationTickets = fresh.registrationTickets
  mockAuthState.unregisteredWallets = fresh.unregisteredWallets
  mockAuthState.currentRefreshCookieId = fresh.currentRefreshCookieId
  mockAuthState.accessTokenVersion = fresh.accessTokenVersion
  mockAuthState.nonceCounter = fresh.nonceCounter
  mockAuthState.sessionCounter = fresh.sessionCounter
  mockAuthState.failureModes = fresh.failureModes
  mockAuthState.delays = fresh.delays
  mockAuthState.requestCounts = fresh.requestCounts
}

export function setMockAuthFailureMode(
  endpoint: keyof MockAuthState["failureModes"],
  mode: MockAuthFailureMode,
): void {
  mockAuthState.failureModes[endpoint] = mode
}

export function setMockAuthDelay(
  endpoint: keyof MockAuthState["delays"],
  ms: number,
): void {
  mockAuthState.delays[endpoint] = ms
}

/**
 * Signer used for testing.
 *
 * Previously, mock created fake signatures in the format `0x<address>000…`. That's the only way
 * works with test: a real MetaMask signature is always rejected, so `pnpm dev`
 * With a real wallet, you can never log in. Now mock verify the real EIP-191 signature,
 * and test also authentically sign with the key below.
 *
 * These are the two default accounts of Anvil/Hardhat - public key, no account kept
 * What product? They only exist in mock/test code.
 */
const MOCK_SIGNER_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const

const MOCK_OTHER_SIGNER_PRIVATE_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as const

export const mockSigner = privateKeyToAccount(MOCK_SIGNER_PRIVATE_KEY)

/** Second Signer — used for testing "another person's signature". */
export const mockOtherSigner = privateKeyToAccount(
  MOCK_OTHER_SIGNER_PRIVATE_KEY,
)

export const MOCK_ADDRESS = mockSigner.address
export const MOCK_OTHER_ADDRESS = mockOtherSigner.address

export function signMockMessage(
  message: string,
  account = mockSigner,
): Promise<`0x${string}`> {
  return account.signMessage({ message })
}

export function mockUserIdForAddress(walletAddress: Address): string {
  return `user_${walletAddress.toLowerCase()}`
}
