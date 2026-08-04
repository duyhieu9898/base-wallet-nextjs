import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState, type ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Address } from "viem"

import { AuthBootstrapBoundary } from "@/features/auth/components/auth-bootstrap-boundary"
import { AuthStatus } from "@/features/auth/components/auth-status"
import { AuthWalletBindingGate } from "@/features/auth/components/auth-wallet-binding-gate"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { AuthRuntimeProvider } from "@/features/auth/runtime/auth-runtime-provider"
import { I18nProvider } from "@/i18n/i18n-provider"
import { queryKeys } from "@/lib/query/query-keys"
import {
  MOCK_ADDRESS,
  MOCK_OTHER_ADDRESS,
  signMockMessage,
  mockAuthState,
  setMockAuthDelay,
} from "@/mocks/data/auth-session"
import { PROTECTED_RESOURCE_PATH } from "@/mocks/handlers/protected-handlers"
import { getDefaultEvmNetwork } from "@/web3/evm/adapters/evm-registry.adapter"
import type { EvmSelection } from "@/web3/evm/selection/evm-selection"

/**
 * Integration coverage for the entire auth flow.
 *
 * The test here proves that the modules **compose** are correct with each other. Edge case details
 * still belong to the unit test of each module — duplicating them here is just testing
 * slow without increasing evidence.
 */

const ADDRESS = MOCK_ADDRESS
const OTHER_ADDRESS = MOCK_OTHER_ADDRESS
const network = getDefaultEvmNetwork()
const CHAIN_ID = network.chain.id

function readySelection(account: Address): EvmSelection {
  return {
    status: "ready",
    account,
    walletChainId: CHAIN_ID,
    chainId: CHAIN_ID,
    network,
    networks: [network],
  }
}

let currentSelection: EvmSelection = readySelection(ADDRESS)
const selectionListeners = new Set<() => void>()

/** Simulates a user changing accounts in the wallet: must do a re-render component. */
function setSelection(next: EvmSelection): void {
  currentSelection = next

  for (const listener of selectionListeners) {
    listener()
  }
}

vi.mock("@/web3/evm/selection/use-evm-selection", async () => {
  const { useSyncExternalStore } = await import("react")

  return {
    useEvmSelection: () =>
      useSyncExternalStore(
        (listener: () => void) => {
          selectionListeners.add(listener)

          return () => selectionListeners.delete(listener)
        },
        () => currentSelection,
        () => currentSelection,
      ),
  }
})

const disconnectSpy = vi.fn()

vi.mock("wagmi", () => ({
  useSignMessage: () => ({
    mutateAsync: ({ message }: { message: string }) => signMockMessage(message),
  }),
  useDisconnect: () => ({ disconnect: disconnectSpy }),
}))

beforeEach(() => {
  setSelection(readySelection(ADDRESS))
  disconnectSpy.mockClear()
})

/** Stands for a business feature with data associated with the backend identity. */
function ProtectedResource() {
  const { apiClient } = useAuth()
  const [result, setResult] = useState<string>("")

  return (
    <div>
      <span data-testid="protected-result">{result}</span>

      <button
        type="button"
        onClick={() => {
          void apiClient
            .request<{ tokenVersion: number }>(PROTECTED_RESOURCE_PATH)
            .then((data) => {
              setResult(`ok:${data.tokenVersion}`)
            })
            .catch(() => {
              setResult("failed")
            })
        }}
      >
        Load protected data
      </button>

      {/* The two requests are actually parallel — not two clicks in succession. */}
      <button
        type="button"
        onClick={() => {
          void Promise.allSettled([
            apiClient.request(PROTECTED_RESOURCE_PATH),
            apiClient.request(PROTECTED_RESOURCE_PATH),
          ]).then(() => {
            setResult("concurrent-settled")
          })
        }}
      >
        Load protected data concurrently
      </button>
    </div>
  )
}

function renderApplication() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <AuthRuntimeProvider>
            <AuthBootstrapBoundary>
              <AuthWalletBindingGate>{children}</AuthWalletBindingGate>
            </AuthBootstrapBoundary>
          </AuthRuntimeProvider>
        </QueryClientProvider>
      </I18nProvider>
    )
  }

  const { unmount } = render(
    <>
      <AuthStatus />
      <ProtectedResource />
    </>,
    { wrapper: Wrapper },
  )

  return { queryClient, unmount, user: userEvent.setup() }
}

const PROFILE_KEY = [...queryKeys.userScoped.all, "profile"] as const

const signInButton = () =>
  screen.getByRole("button", { name: "Sign in with wallet" })

describe("full session lifecycle", () => {
  it("goes from sign-in through refresh and wallet mismatch to logout", async () => {
    const { queryClient, user } = renderApplication()

    // Bootstrap: no session, application renders login UI.
    await waitFor(() => {
      expect(signInButton()).toBeInTheDocument()
    })

    // 1. Sign in with wallet.
    await user.click(signInButton())

    await waitFor(() => {
      expect(screen.getByText("Signed in")).toBeInTheDocument()
    })

    expect(screen.getByText(ADDRESS)).toBeInTheDocument()
    expect(mockAuthState.requestCounts.nonce).toBe(1)
    expect(mockAuthState.requestCounts.verify).toBe(1)

    // Data of a hypothetical business feature, put the key under `userScoped` correctly
    // according to the contract in `query-keys.ts`.
    queryClient.setQueryData(PROFILE_KEY, { id: "user_1" })

    // 2. Protected request succeeds with current access token.
    await user.click(
      screen.getByRole("button", { name: "Load protected data" }),
    )

    await waitFor(() => {
      expect(screen.getByTestId("protected-result")).toHaveTextContent("ok:")
    })

    // Bootstrap took a refresh (no session at mount); this request
    // Use a valid token so no additional refreshes are created.
    const refreshesBeforeExpiry = mockAuthState.requestCounts.refresh

    // 3. Access token expires → exactly one refresh, then replay successfully.
    mockAuthState.accessTokenVersion += 1

    await user.click(
      screen.getByRole("button", { name: "Load protected data" }),
    )

    await waitFor(() => {
      expect(screen.getByTestId("protected-result")).toHaveTextContent(
        `ok:${mockAuthState.accessTokenVersion}`,
      )
    })

    expect(mockAuthState.requestCounts.refresh).toBe(refreshesBeforeExpiry + 1)

    // 4. User changes to another wallet → application is locked.
    setSelection(readySelection(OTHER_ADDRESS))

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })

    expect(
      screen.getByText("Wallet does not match your session"),
    ).toBeInTheDocument()

    // 5. Switch back to the correct wallet → automatically unlock, no need to re-sign.
    setSelection(readySelection(ADDRESS))

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    expect(mockAuthState.requestCounts.verify).toBe(1)
    expect(screen.getByText("Signed in")).toBeInTheDocument()

    // 6. Logout.
    await user.click(screen.getByRole("button", { name: "Sign out" }))

    await waitFor(() => {
      expect(signInButton()).toBeInTheDocument()
    })

    // Backend session is revoke, user-scoped cache is deleted...
    expect(mockAuthState.currentRefreshCookieId).toBeNull()
    expect(queryClient.getQueryData(PROFILE_KEY)).toBeUndefined()

    // …but the wallet is still connected and the Web3 state is untouched.
    expect(disconnectSpy).not.toHaveBeenCalled()
    expect(currentSelection.status).toBe("ready")
    expect(currentSelection.account).toBe(ADDRESS)
  })
})

describe("logout wins a race against a late refresh", () => {
  it("keeps the session unauthenticated when the refresh lands after logout", async () => {
    const { user } = renderApplication()

    await waitFor(() => {
      expect(signInButton()).toBeInTheDocument()
    })

    await user.click(signInButton())

    await waitFor(() => {
      expect(screen.getByText("Signed in")).toBeInTheDocument()
    })

    // Two protected requests simultaneously encountered an expired access token.
    const refreshesBeforeExpiry = mockAuthState.requestCounts.refresh

    mockAuthState.accessTokenVersion += 1
    setMockAuthDelay("refresh", 30)

    await user.click(
      screen.getByRole("button", {
        name: "Load protected data concurrently",
      }),
    )

    // Logout occurs while refresh is in progress.
    await user.click(screen.getByRole("button", { name: "Sign out" }))

    await waitFor(() => {
      expect(signInButton()).toBeInTheDocument()
    })

    // Refresh returns late: generation has changed so it does not restore the session.
    await new Promise((resolve) => setTimeout(resolve, 80))

    expect(signInButton()).toBeInTheDocument()
    expect(screen.queryByText("Signed in")).not.toBeInTheDocument()
    // Multiple callers at the same time still only create one refresh request.
    expect(mockAuthState.requestCounts.refresh).toBe(refreshesBeforeExpiry + 1)
  })
})

describe("reload recovery", () => {
  it("restores the session from the refresh cookie when the app remounts", async () => {
    const { user, unmount } = renderApplication()

    await waitFor(() => {
      expect(signInButton()).toBeInTheDocument()
    })

    await user.click(signInButton())

    await waitFor(() => {
      expect(screen.getByText("Signed in")).toBeInTheDocument()
    })

    const refreshesBeforeReload = mockAuthState.requestCounts.refresh

    // Simulate tab reload: the entire tree is removed, so the access token is in memory
    // lost with provider. Only refresh cookies on the backend that are alive.
    unmount()

    expect(screen.queryByText("Signed in")).not.toBeInTheDocument()

    renderApplication()

    // Right after remounting, the application has not concluded anything: it has to ask
    // backend and not infer "logged in" from the connecting wallet.
    expect(screen.queryByText("Signed in")).not.toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText("Signed in")).toBeInTheDocument()
    })

    expect(screen.getByText(ADDRESS)).toBeInTheDocument()

    // The session is restored with exactly one bootstrap refresh — no re-signing.
    expect(mockAuthState.requestCounts.refresh).toBe(refreshesBeforeReload + 1)
    expect(mockAuthState.requestCounts.verify).toBe(1)
    expect(mockAuthState.requestCounts.nonce).toBe(1)
  })
})
