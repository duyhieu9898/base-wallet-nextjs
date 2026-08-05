import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useEffect, type ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Address } from "viem"

import { requestSiweNonce, verifySiwe } from "@/features/auth/api/auth-api"
import { buildSiweMessage } from "@/features/auth/domain/siwe-message"
import { useAuthenticatedWallet } from "@/features/auth/hooks/use-authenticated-wallet"
import { AuthRuntimeProvider } from "@/features/auth/runtime/auth-runtime-provider"
import { I18nProvider } from "@/i18n/i18n-provider"
import {
  MOCK_ADDRESS,
  MOCK_OTHER_ADDRESS,
  signMockMessage,
} from "@/mocks/data/auth-session"
import { type EvmSelection, getDefaultEvmNetwork } from "@/web3/evm"
import { AuthWalletBindingGate } from "./auth-wallet-binding-gate"

const ADDRESS = MOCK_ADDRESS
const OTHER_ADDRESS = MOCK_OTHER_ADDRESS
const network = getDefaultEvmNetwork()
const CHAIN_ID = network.chain.id

function readySelection(
  account: Address,
  chainId: number = CHAIN_ID,
): EvmSelection {
  return {
    status: "ready",
    account,
    walletChainId: chainId,
    chainId,
    network,
    networks: [network],
  }
}

const disconnectedSelection: EvmSelection = {
  status: "disconnected",
  account: null,
  walletChainId: null,
  chainId: CHAIN_ID,
  network,
  networks: [network],
}

let currentSelection: EvmSelection = readySelection(ADDRESS)
const selectionListeners = new Set<() => void>()

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

beforeEach(() => {
  setSelection(readySelection(ADDRESS))
})

/** Creates a valid session in the mock backend for bootstrap refresh to find. */
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

let assertReady: () => void

function GuardProbe() {
  const wallet = useAuthenticatedWallet()

  useEffect(() => {
    assertReady = wallet.assertReady
  })

  return <span data-testid="binding">{wallet.binding.status}</span>
}

function renderGate() {
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

  render(
    <AuthWalletBindingGate>
      <button type="button">application action</button>
      <GuardProbe />
    </AuthWalletBindingGate>,
    { wrapper: Wrapper },
  )
}

async function renderAuthenticatedGate() {
  await seedBackendSession()
  renderGate()

  await waitFor(() => {
    expect(screen.getByTestId("binding")).toHaveTextContent("matched")
  })
}

describe("blocking behavior", () => {
  it("does not open the modal when the wallet matches", async () => {
    await renderAuthenticatedGate()

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("opens the modal when the connected wallet differs", async () => {
    await renderAuthenticatedGate()

    setSelection(readySelection(OTHER_ADDRESS))

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })

    expect(
      screen.getByText("Wallet does not match your session"),
    ).toBeInTheDocument()
  })

  it("opens the modal when the wallet disconnects", async () => {
    await renderAuthenticatedGate()

    setSelection(disconnectedSelection)

    await waitFor(() => {
      expect(screen.getByText("Wallet disconnected")).toBeInTheDocument()
    })
  })

  it("stays closed while unauthenticated", async () => {
    setSelection(readySelection(OTHER_ADDRESS))
    renderGate()

    await waitFor(() => {
      expect(screen.getByTestId("binding")).toHaveTextContent("not-applicable")
    })

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("does not treat a chain change as an address mismatch", async () => {
    await renderAuthenticatedGate()

    setSelection(readySelection(ADDRESS, 1))

    await waitFor(() => {
      expect(screen.getByTestId("binding")).toHaveTextContent("matched")
    })

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})

describe("no dismissal path", () => {
  async function openMismatchModal() {
    await renderAuthenticatedGate()

    setSelection(readySelection(OTHER_ADDRESS))

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })
  }

  it("has no close button and no continue-anyway action", async () => {
    await openMismatchModal()

    const dialog = screen.getByRole("dialog")
    const buttonLabels = Array.from(
      dialog.querySelectorAll("button"),
      (button) => button.textContent?.trim(),
    )

    expect(buttonLabels).toEqual(["Sign out"])
  })

  it("does not close on Escape", async () => {
    const user = userEvent.setup()

    await openMismatchModal()

    await user.keyboard("{Escape}")

    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("does not close on a backdrop click", async () => {
    const user = userEvent.setup()

    await openMismatchModal()

    await user.click(document.body)

    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("marks the dialog as modal and keeps focus inside it", async () => {
    await openMismatchModal()

    const dialog = screen.getByRole("dialog")

    expect(dialog).toHaveAttribute("aria-modal", "true")

    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true)
    })
  })

  it("shows both addresses so the user knows which wallet to switch to", async () => {
    await openMismatchModal()

    // Deduce from the constant itself instead of the hardcode prefix: change signer test no
    // getting this test done is red for meaningless reasons.
    expect(screen.getByTestId("session-address")).toHaveTextContent(
      ADDRESS.slice(0, 6),
    )
    expect(screen.getByTestId("connected-address")).toHaveTextContent(
      OTHER_ADDRESS.slice(0, 6),
    )
  })

  it("takes the application behind the modal out of reach", async () => {
    await renderAuthenticatedGate()

    // Before locking, the application's actions can be used normally.
    expect(
      screen.getByRole("button", { name: "application action" }),
    ).toBeInTheDocument()

    setSelection(readySelection(OTHER_ADDRESS))

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })

    // Once locked, the background node is no longer in the accessibility tree — no
    // click, do not Tab to, screen reader does not read.
    expect(
      screen.queryByRole("button", { name: "application action" }),
    ).toBeNull()

    // But it's still in the DOM: gate doesn't unmount the application, thus opening it
    // Locking does not cause loss of page state.
    const backgroundAction = screen.getByText("application action")
    const inertWrapper = document.querySelector("[inert]")

    expect(inertWrapper).not.toBeNull()
    expect(inertWrapper?.contains(backgroundAction)).toBe(true)
    // Modal is outside the inert area, otherwise it will also be locked.
    expect(inertWrapper?.contains(screen.getByRole("dialog"))).toBe(false)
  })

  it("puts the application back in reach once the wallet matches", async () => {
    await renderAuthenticatedGate()

    setSelection(readySelection(OTHER_ADDRESS))

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })

    setSelection(readySelection(ADDRESS))

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    expect(document.querySelector("[inert]")).toBeNull()
    expect(
      screen.getByRole("button", { name: "application action" }),
    ).toBeInTheDocument()
  })
})

describe("unlocking", () => {
  it("closes automatically when the correct wallet is selected again", async () => {
    await renderAuthenticatedGate()

    setSelection(readySelection(OTHER_ADDRESS))

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })

    setSelection(readySelection(ADDRESS))

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    expect(screen.getByTestId("binding")).toHaveTextContent("matched")
  })

  it("closes after logging out from the modal", async () => {
    const user = userEvent.setup()

    await renderAuthenticatedGate()

    setSelection(readySelection(OTHER_ADDRESS))

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: "Sign out" }))

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    expect(screen.getByTestId("binding")).toHaveTextContent("not-applicable")
  })
})

describe("domain guard", () => {
  it("blocks a protected action even when the modal is bypassed", async () => {
    await renderAuthenticatedGate()

    expect(() => {
      assertReady()
    }).not.toThrow()

    setSelection(readySelection(OTHER_ADDRESS))

    await waitFor(() => {
      expect(screen.getByTestId("binding")).toHaveTextContent(
        "wallet-mismatched",
      )
    })

    expect(() => {
      assertReady()
    }).toThrowError(expect.objectContaining({ code: "AUTH_WALLET_MISMATCH" }))
  })

  it("blocks a protected action while unauthenticated", async () => {
    renderGate()

    await waitFor(() => {
      expect(screen.getByTestId("binding")).toHaveTextContent("not-applicable")
    })

    expect(() => {
      assertReady()
    }).toThrowError(expect.objectContaining({ code: "AUTH_REQUIRED" }))
  })
})
