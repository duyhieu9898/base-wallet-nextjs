import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useEffect, type ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { requestSiweNonce, verifySiwe } from "@/features/auth/api/auth-api"
import { buildSiweMessage } from "@/features/auth/domain/siwe-message"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { queryKeys } from "@/lib/query/query-keys"
import {
  MOCK_ADDRESS,
  signMockMessage,
  mockAuthState,
  setMockAuthDelay,
  setMockAuthFailureMode,
} from "@/mocks/data/auth-session"
import { PROTECTED_RESOURCE_PATH } from "@/mocks/handlers/protected-handlers"
import { type EvmSelection, getDefaultEvmNetwork } from "@/web3/evm"
import { AuthRuntimeProvider } from "./auth-runtime-provider"
import type { AuthenticatedApiClient } from "./authenticated-api-client"

const ADDRESS = MOCK_ADDRESS
const network = getDefaultEvmNetwork()
const CHAIN_ID = network.chain.id

const readySelection: EvmSelection = {
  status: "ready",
  account: ADDRESS,
  walletChainId: CHAIN_ID,
  chainId: CHAIN_ID,
  network,
  networks: [network],
}

const disconnectSpy = vi.fn()

vi.mock("@/web3/evm/selection/use-evm-selection", () => ({
  useEvmSelection: () => readySelection,
}))

beforeEach(() => {
  disconnectSpy.mockClear()
})

/** The key that Wagmi uses — auth is never touched. */
const WAGMI_KEY = ["balance", { address: ADDRESS, chainId: CHAIN_ID }] as const

/**
 * Two hypothetical business features, put the key under `userScoped` according to the contract
 * in `query-keys.ts`. Test building keys in place instead of borrowing existing keys: cleanup
 * must work with any root-compliant feature, not just those
 * has been listed before.
 */
const PROFILE_KEY = [...queryKeys.userScoped.all, "profile"] as const
const NOTIFICATIONS_KEY = [
  ...queryKeys.userScoped.all,
  "notifications",
  { address: ADDRESS },
] as const

/**
 * Public data of a hypothetical feature — is OUTSIDE `userScoped`, so logout
 * Do not touch.
 */
const PUBLIC_KEY = ["prices", "asset", { assetId: "eth" }] as const

function seedCache(queryClient: QueryClient): void {
  queryClient.setQueryData(PROFILE_KEY, { id: "user_1" })
  queryClient.setQueryData(NOTIFICATIONS_KEY, { unread: 3 })
  queryClient.setQueryData(PUBLIC_KEY, { price: 1 })
  queryClient.setQueryData(WAGMI_KEY, { value: 1n })
}

async function seedBackendSession(): Promise<void> {
  const nonce = await requestSiweNonce({
    walletAddress: ADDRESS,
    chainId: CHAIN_ID,
  })

  const message = buildSiweMessage({
    domain: "localhost:3000",
    address: ADDRESS,
    uri: "http://localhost:3000",
    chainId: CHAIN_ID,
    nonce: nonce.nonce,
    issuedAt: nonce.issuedAt,
    expirationTime: nonce.expirationTime,
  })

  await verifySiwe({
    message: message,
    signature: await signMockMessage(message),
  })
}

let apiClientRef: AuthenticatedApiClient
let logoutRef: () => Promise<void>

function LogoutProbe() {
  const { state, logout, isLoggingOut, logoutError, apiClient } = useAuth()

  useEffect(() => {
    apiClientRef = apiClient
    logoutRef = logout
  }, [apiClient, logout])

  return (
    <div>
      <span data-testid="status">{state.status}</span>
      <span data-testid="logout-error">{logoutError?.code ?? ""}</span>

      <button
        type="button"
        disabled={isLoggingOut}
        onClick={() => {
          void logout()
        }}
      >
        Sign out
      </button>
    </div>
  )
}

async function renderAuthenticated() {
  await seedBackendSession()

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthRuntimeProvider>{children}</AuthRuntimeProvider>
      </QueryClientProvider>
    )
  }

  render(<LogoutProbe />, { wrapper: Wrapper })

  await waitFor(() => {
    expect(screen.getByTestId("status")).toHaveTextContent("authenticated")
  })

  seedCache(queryClient)

  return { queryClient, user: userEvent.setup() }
}

describe("logout", () => {
  it("revokes the backend session and clears user-scoped cache", async () => {
    const { queryClient, user } = await renderAuthenticated()

    await user.click(screen.getByRole("button", { name: "Sign out" }))

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated")
    })

    expect(mockAuthState.currentRefreshCookieId).toBeNull()
    expect(queryClient.getQueryData(PROFILE_KEY)).toBeUndefined()
  })

  it("keeps Web3 and public cache intact", async () => {
    const { queryClient, user } = await renderAuthenticated()

    await user.click(screen.getByRole("button", { name: "Sign out" }))

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated")
    })

    expect(queryClient.getQueryData(WAGMI_KEY)).toEqual({ value: 1n })
    expect(queryClient.getQueryData(PUBLIC_KEY)).toEqual({ price: 1 })
  })

  it("does not disconnect the wallet", async () => {
    const { user } = await renderAuthenticated()

    await user.click(screen.getByRole("button", { name: "Sign out" }))

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated")
    })

    expect(disconnectSpy).not.toHaveBeenCalled()
  })

  it("disables the button while the request is in flight", async () => {
    const { user } = await renderAuthenticated()

    setMockAuthDelay("logout", 20)

    const button = screen.getByRole("button", { name: "Sign out" })

    await user.click(button)

    await waitFor(() => {
      expect(button).toBeDisabled()
    })

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated")
    })
  })

  it("sends one request even when logout is invoked directly twice", async () => {
    await renderAuthenticated()

    setMockAuthDelay("logout", 20)

    // Ignore the UI completely: the disabled button cannot be the only guard.
    await act(async () => {
      await Promise.all([logoutRef(), logoutRef()])
    })

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated")
    })

    expect(mockAuthState.requestCounts.logout).toBe(1)
  })

  it("allows a retry after a failed logout", async () => {
    await renderAuthenticated()

    setMockAuthFailureMode("logout", "server-error")

    await act(async () => {
      await logoutRef()
    })

    await waitFor(() => {
      expect(screen.getByTestId("logout-error")).toHaveTextContent(
        "LOGOUT_FAILED",
      )
    })

    // Guard in-flight must be released, otherwise the logout button is permanently dead.
    setMockAuthFailureMode("logout", "none")

    await act(async () => {
      await logoutRef()
    })

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated")
    })
  })

  it("keeps the session when the backend is unavailable", async () => {
    const { queryClient, user } = await renderAuthenticated()

    setMockAuthFailureMode("logout", "server-error")

    await user.click(screen.getByRole("button", { name: "Sign out" }))

    await waitFor(() => {
      expect(screen.getByTestId("logout-error")).toHaveTextContent(
        "LOGOUT_FAILED",
      )
    })

    expect(screen.getByTestId("status")).toHaveTextContent("authenticated")
    expect(queryClient.getQueryData(PROFILE_KEY)).toEqual({
      id: "user_1",
    })
  })

  it("succeeds on retry after a transient failure", async () => {
    const { user } = await renderAuthenticated()

    setMockAuthFailureMode("logout", "network-error")

    await user.click(screen.getByRole("button", { name: "Sign out" }))

    await waitFor(() => {
      expect(screen.getByTestId("logout-error")).toHaveTextContent(
        "LOGOUT_FAILED",
      )
    })

    setMockAuthFailureMode("logout", "none")

    await user.click(screen.getByRole("button", { name: "Sign out" }))

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated")
    })
  })

  it("treats an already-absent session as terminal success", async () => {
    const { user } = await renderAuthenticated()

    // The backend has lost the session before (for example, it was revoked elsewhere).
    mockAuthState.currentRefreshCookieId = null

    await user.click(screen.getByRole("button", { name: "Sign out" }))

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated")
    })

    expect(screen.getByTestId("logout-error")).toHaveTextContent("")
  })

  it("does not let a refresh that lands after logout restore the session", async () => {
    const { user } = await renderAuthenticated()

    // Access token expires → protected request will trigger a slow refresh.
    mockAuthState.accessTokenVersion += 1
    setMockAuthDelay("refresh", 30)

    const pendingRequest = apiClientRef
      .request(PROTECTED_RESOURCE_PATH)
      .catch(() => null)

    await user.click(screen.getByRole("button", { name: "Sign out" }))

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated")
    })

    // Refresh returns late: generation has changed so it cannot be committed.
    await pendingRequest

    expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated")
    expect(mockAuthState.requestCounts.refresh).toBeGreaterThan(0)
  })
})
