import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { I18nProvider } from "@/i18n/i18n-provider"
import { AuthRuntimeProvider } from "@/features/auth/runtime/auth-runtime-provider"
import { MOCK_ADDRESS, signMockMessage } from "@/mocks/data/auth-session"
import { type EvmSelection, getDefaultEvmNetwork } from "@/web3/evm"
import { AuthStatus } from "./auth-status"

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

const disconnectedSelection: EvmSelection = {
  status: "disconnected",
  account: null,
  walletChainId: null,
  chainId: CHAIN_ID,
  network,
  networks: [network],
}

const unsupportedSelection: EvmSelection = {
  status: "unsupported",
  account: ADDRESS,
  walletChainId: 999_999,
  chainId: null,
  network: null,
  networks: [network],
}

let currentSelection: EvmSelection = readySelection

vi.mock("@/web3/evm/chain/selection/use-evm-selection", () => ({
  useEvmSelection: () => currentSelection,
}))

vi.mock("wagmi", () => ({
  useSignMessage: () => ({
    mutateAsync: ({ message }: { message: string }) => signMockMessage(message),
  }),
}))

beforeEach(() => {
  currentSelection = readySelection
})

function renderAuthStatus() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <AuthRuntimeProvider>{children}</AuthRuntimeProvider>
        </QueryClientProvider>
      </I18nProvider>
    )
  }

  render(<AuthStatus />, { wrapper: Wrapper })

  return waitFor(() => {
    expect(
      screen.getByRole("button", { name: "Sign in with wallet" }),
    ).toBeInTheDocument()
  })
}

describe("AuthStatus", () => {
  it("offers wallet sign-in and no password fields", async () => {
    await renderAuthStatus()

    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument()
    expect(document.body.textContent).not.toContain("demo@example.com")
  })

  it("signs in with the wallet and shows the session address", async () => {
    const user = userEvent.setup()

    await renderAuthStatus()

    await user.click(
      screen.getByRole("button", { name: "Sign in with wallet" }),
    )

    await waitFor(() => {
      expect(screen.getByText("Signed in")).toBeInTheDocument()
    })

    expect(screen.getByText(ADDRESS)).toBeInTheDocument()
    expect(screen.getByText("user")).toBeInTheDocument()
  })

  it("signs out and returns to the sign-in card", async () => {
    const user = userEvent.setup()

    await renderAuthStatus()

    await user.click(
      screen.getByRole("button", { name: "Sign in with wallet" }),
    )

    await waitFor(() => {
      expect(screen.getByText("Signed in")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: "Sign out" }))

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Sign in with wallet" }),
      ).toBeInTheDocument()
    })
  })

  it("asks the user to connect a wallet first", async () => {
    currentSelection = disconnectedSelection

    await renderAuthStatus()

    expect(screen.getByText("Connect a wallet to sign in.")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Sign in with wallet" }),
    ).toBeDisabled()
  })

  it("asks the user to switch network before signing in", async () => {
    currentSelection = unsupportedSelection

    await renderAuthStatus()

    expect(
      screen.getByText("Switch to a supported network before signing in."),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Sign in with wallet" }),
    ).toBeDisabled()
  })
})
