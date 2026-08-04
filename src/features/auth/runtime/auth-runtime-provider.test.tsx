import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { StrictMode, useEffect, type ReactNode } from "react"
import { describe, expect, it } from "vitest"

import { requestSiweNonce, verifySiwe } from "@/features/auth/api/auth-api"
import { buildSiweMessage } from "@/features/auth/domain/siwe-message"
import { AuthBootstrapBoundary } from "@/features/auth/components/auth-bootstrap-boundary"
import { useAuth } from "@/features/auth/hooks/use-auth"
import {
  MOCK_ADDRESS,
  signMockMessage,
  mockAuthState,
  setMockAuthFailureMode,
} from "@/mocks/data/auth-session"
import { I18nProvider } from "@/i18n/i18n-provider"
import { AuthRuntimeProvider } from "./auth-runtime-provider"
import { useAuthRuntime } from "./auth-runtime-context"

const ADDRESS = MOCK_ADDRESS
const CHAIN_ID = 11155111

function createWrapper(options: { strict?: boolean } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  function Wrapper({ children }: { children: ReactNode }) {
    const tree = (
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <AuthRuntimeProvider>{children}</AuthRuntimeProvider>
        </QueryClientProvider>
      </I18nProvider>
    )

    return options.strict ? <StrictMode>{tree}</StrictMode> : tree
  }

  return { Wrapper, queryClient }
}

function AuthProbe() {
  const { state } = useAuth()

  return (
    <div>
      <span data-testid="status">{state.status}</span>
      {state.status === "authenticated" && (
        <span data-testid="address">{state.user.walletAddress}</span>
      )}
    </div>
  )
}

/** Creates a valid refresh session on the mock backend without touching the runtime. */
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

describe("bootstrap", () => {
  it("starts in bootstrapping and resolves to authenticated when a session exists", async () => {
    await seedBackendSession()

    const { Wrapper } = createWrapper()

    render(<AuthProbe />, { wrapper: Wrapper })

    expect(screen.getByTestId("status")).toHaveTextContent("bootstrapping")

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated")
    })

    expect(screen.getByTestId("address")).toHaveTextContent(ADDRESS)
  })

  it("resolves to unauthenticated when the backend rejects the refresh", async () => {
    const { Wrapper } = createWrapper()

    render(<AuthProbe />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated")
    })
  })

  it("resolves to unavailable — not unauthenticated — on a network failure", async () => {
    setMockAuthFailureMode("refresh", "network-error")

    const { Wrapper } = createWrapper()

    render(<AuthProbe />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("unavailable")
    })
  })

  it("resolves to unavailable on a server error", async () => {
    setMockAuthFailureMode("refresh", "server-error")

    const { Wrapper } = createWrapper()

    render(<AuthProbe />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("unavailable")
    })
  })

  it("runs exactly one refresh, even under Strict Mode double mounting", async () => {
    await seedBackendSession()

    const { Wrapper } = createWrapper({ strict: true })

    render(<AuthProbe />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated")
    })

    expect(mockAuthState.requestCounts.refresh).toBe(1)
  })
})

describe("bootstrap boundary", () => {
  it("does not render children while bootstrapping", async () => {
    const { Wrapper } = createWrapper()

    render(
      <AuthBootstrapBoundary>
        <span>protected application</span>
      </AuthBootstrapBoundary>,
      { wrapper: Wrapper },
    )

    expect(screen.queryByText("protected application")).not.toBeInTheDocument()
    expect(screen.getByRole("status")).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText("protected application")).toBeInTheDocument()
    })
  })

  it("offers a retry that recovers from an unavailable backend", async () => {
    const user = userEvent.setup()

    await seedBackendSession()
    setMockAuthFailureMode("refresh", "server-error")

    const { Wrapper } = createWrapper()

    render(
      <AuthBootstrapBoundary>
        <AuthProbe />
      </AuthBootstrapBoundary>,
      { wrapper: Wrapper },
    )

    await waitFor(() => {
      expect(
        screen.getByText("Could not verify your session"),
      ).toBeInTheDocument()
    })

    // Not presented as logged out.
    expect(screen.queryByTestId("status")).not.toBeInTheDocument()

    setMockAuthFailureMode("refresh", "none")

    await user.click(screen.getByRole("button", { name: "Try again" }))

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated")
    })
  })
})

describe("context surface", () => {
  it("never exposes the access token", async () => {
    await seedBackendSession()

    let captured: unknown = null

    function Capture() {
      const runtime = useAuthRuntime()

      useEffect(() => {
        captured = runtime
      }, [runtime])

      return null
    }

    const { Wrapper } = createWrapper()

    render(<Capture />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(mockAuthState.requestCounts.refresh).toBe(1)
    })

    const serialized = JSON.stringify(captured, (_key, value: unknown) =>
      typeof value === "function" ? "[fn]" : value,
    )

    expect(serialized).not.toContain("mock-access-token")
    expect(Object.keys(captured as object)).not.toContain("tokenStore")
  })

  it("throws a helpful error when used outside the provider", () => {
    function Orphan() {
      useAuthRuntime()

      return null
    }

    expect(() => render(<Orphan />)).toThrowError(/AuthRuntimeProvider/)
  })
})
