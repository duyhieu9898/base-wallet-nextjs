import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen, waitFor } from "@testing-library/react"
import { useEffect, type ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Address } from "viem"

import { type EvmSelection, getDefaultEvmNetwork } from "@/web3/evm"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { AuthRuntimeProvider } from "@/features/auth/runtime/auth-runtime-provider"
import {
  MOCK_ADDRESS,
  MOCK_OTHER_ADDRESS,
  mockAuthState,
  mockOtherSigner,
  signMockMessage,
  setMockAuthDelay,
  setMockAuthFailureMode,
} from "@/mocks/data/auth-session"
import { useSiweLogin } from "./use-siwe-login"

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

const connectingSelection: EvmSelection = {
  status: "connecting",
  account: null,
  walletChainId: null,
  chainId: null,
  network: null,
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

/**
 * Small store simulating Wagmi: exchange wallet must do component re-render, like when
 * User changes account in extension. If just assigning variables, `selectionRef` in
 * The hook will never see the new value and the test will prove wrong
 * prove.
 */
let currentSelection: EvmSelection = readySelection(ADDRESS)
const selectionListeners = new Set<() => void>()

function setSelection(next: EvmSelection): void {
  currentSelection = next

  for (const listener of selectionListeners) {
    listener()
  }
}

/** Mock signing function — test instead to simulate rejection or slow signing. */
let signMessageImpl: (input: { message: string }) => Promise<`0x${string}`>

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

vi.mock("wagmi", () => ({
  useSignMessage: () => ({
    mutateAsync: (input: { message: string }) => signMessageImpl(input),
  }),
}))

beforeEach(() => {
  setSelection(readySelection(ADDRESS))
  // Sign it for real with the test key, exactly like the real wallet signs the message.
  signMessageImpl = ({ message }) => signMockMessage(message)
})

type HarnessHandle = {
  signIn: () => Promise<void>
  logout: () => Promise<void>
}

type HarnessHolder = { current: HarnessHandle | null }

/**
 * Mỗi lần render tạo một holder riêng, và `handle` chỉ đọc holder đang active.
 *
 * Không dùng một biến module-level được gán thẳng trong `useEffect`: tree của
 * test trước có thể chưa cleanup xong khi test sau đã render. Một response về
 * muộn làm tree cũ re-render, effect chạy lại và ghi đè handle bằng closure của
 * component đã unmount — test hiện tại sẽ drive cái tree chết đó và state không
 * bao giờ xuất hiện trên DOM đang assert. Đây là race chỉ lộ ra khi suite chạy
 * song song.
 */
let activeHolderRef: HarnessHolder = { current: null }

const handle: HarnessHandle = {
  signIn: () => {
    if (activeHolderRef.current === null) {
      throw new Error("Harness chưa sẵn sàng: gọi renderHarness() trước.")
    }

    return activeHolderRef.current.signIn()
  },
  logout: () => {
    if (activeHolderRef.current === null) {
      throw new Error("Harness chưa sẵn sàng: gọi renderHarness() trước.")
    }

    return activeHolderRef.current.logout()
  },
}

function Harness({ holderRef }: { holderRef: HarnessHolder }) {
  const login = useSiweLogin()
  const auth = useAuth()

  useEffect(() => {
    holderRef.current = { signIn: login.signIn, logout: auth.logout }
  })

  return (
    <div>
      <span data-testid="status">{auth.state.status}</span>
      <span data-testid="pending">{String(login.isPending)}</span>
      <span data-testid="error">{login.error?.code ?? ""}</span>
      {auth.state.status === "authenticated" && (
        <span data-testid="address">{auth.state.user.walletAddress}</span>
      )}
    </div>
  )
}

function renderHarness() {
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

  const holderRef: HarnessHolder = { current: null }

  activeHolderRef = holderRef

  render(<Harness holderRef={holderRef} />, { wrapper: Wrapper })

  return waitFor(() => {
    expect(screen.getByTestId("status")).toHaveTextContent(/^unauthenticated$/)
  })
}

/**
 * Chờ hook về trạng thái nghỉ trước khi test assert hoặc chạy thao tác kế.
 *
 * `await handle.signIn()` chỉ nói promise của flow đã resolve, không nói React
 * đã commit state kết quả. Assert đồng bộ ngay sau đó là test yếu: nó pass nhờ
 * timing chứ không nhờ hành vi, và fail ngẫu nhiên khi suite chạy song song.
 *
 * `pending` là tín hiệu settle do chính hook công bố, nên chờ nó là chờ đúng
 * thứ cần chờ — không phải `setTimeout` đoán mò.
 */
async function settle() {
  await waitFor(() => {
    expect(screen.getByTestId("pending")).toHaveTextContent(/^false$/)
  })
}

/**
 * `signIn()` im lặng no-op khi `canStartLogin` false — và nó false khi runtime
 * đang `bootstrapping`. `renderHarness()` chỉ chờ lần đầu status chạm
 * `unauthenticated`; runtime vẫn có thể quay lại `bootstrapping` sau đó, và khi
 * đó test sẽ assert một error không bao giờ được set.
 *
 * Chờ ra khỏi `bootstrapping` ngay trước khi drive để test đo đúng hành vi thay
 * vì đo thời điểm.
 */
async function ready() {
  await waitFor(() => {
    expect(screen.getByTestId("status")).not.toHaveTextContent(
      /^bootstrapping$/,
    )
  })
}

async function signIn() {
  await ready()

  await act(async () => {
    await handle.signIn()
  })

  await settle()
}

/**
 * Logout phải settle trước khi login lại: `canStartLogin` từ chối khi session
 * cũ chưa bị gỡ, và lần signIn kế sẽ im lặng no-op.
 */
async function logout() {
  await act(async () => {
    await handle.logout()
  })

  await waitFor(() => {
    expect(screen.getByTestId("status")).toHaveTextContent(/^unauthenticated$/)
  })
}

describe("happy path", () => {
  it("signs in and binds the session to the signing address", async () => {
    await renderHarness()

    await signIn()

    expect(screen.getByTestId("status")).toHaveTextContent(/^authenticated$/)
    expect(screen.getByTestId("address")).toHaveTextContent(ADDRESS)
    expect(mockAuthState.requestCounts.nonce).toBe(1)
    expect(mockAuthState.requestCounts.verify).toBe(1)
  })

  it("requests a fresh nonce when signing in again after logout", async () => {
    await renderHarness()

    await signIn()

    await logout()

    await signIn()

    // The nonce is one-time: the second login cannot reuse the old nonce.
    expect(mockAuthState.requestCounts.nonce).toBe(2)
    expect(mockAuthState.requestCounts.verify).toBe(2)
    expect(screen.getByTestId("status")).toHaveTextContent(/^authenticated$/)
  })

  it("is a no-op when a session already exists", async () => {
    await renderHarness()

    await signIn()

    const nonceCount = mockAuthState.requestCounts.nonce

    await signIn()

    // Do not ask for nonces, do not open wallets, and do not oversign existing sessions.
    expect(mockAuthState.requestCounts.nonce).toBe(nonceCount)
    expect(screen.getByTestId("error")).toHaveTextContent("")
    expect(screen.getByTestId("status")).toHaveTextContent(/^authenticated$/)
  })
})

describe("wallet preconditions", () => {
  it("refuses to sign while the wallet is disconnected", async () => {
    setSelection(disconnectedSelection)

    await renderHarness()
    await signIn()

    expect(screen.getByTestId("error")).toHaveTextContent(
      /^WALLET_DISCONNECTED$/,
    )
    expect(mockAuthState.requestCounts.nonce).toBe(0)
  })

  it("refuses to sign while the wallet is still connecting", async () => {
    setSelection(connectingSelection)

    await renderHarness()
    await signIn()

    expect(screen.getByTestId("error")).toHaveTextContent(/^WALLET_NOT_READY$/)
    expect(mockAuthState.requestCounts.nonce).toBe(0)
  })

  it("refuses to request a nonce on an unsupported network", async () => {
    setSelection(unsupportedSelection)

    await renderHarness()
    await signIn()

    expect(screen.getByTestId("error")).toHaveTextContent(
      /^UNSUPPORTED_NETWORK$/,
    )
    expect(mockAuthState.requestCounts.nonce).toBe(0)
    expect(mockAuthState.requestCounts.verify).toBe(0)
  })
})

describe("signature rejection", () => {
  it("returns to unauthenticated and stays retryable", async () => {
    signMessageImpl = () => Promise.reject({ code: 4001 })

    await renderHarness()
    await signIn()

    expect(screen.getByTestId("error")).toHaveTextContent(
      /^SIGNATURE_REJECTED$/,
    )
    expect(screen.getByTestId("status")).toHaveTextContent(/^unauthenticated$/)
    expect(mockAuthState.requestCounts.verify).toBe(0)

    // You can still re-sign immediately afterwards.
    signMessageImpl = ({ message }) => signMockMessage(message)

    await signIn()

    expect(screen.getByTestId("status")).toHaveTextContent(/^authenticated$/)
  })
})

describe("wallet changes mid-flow", () => {
  it("aborts when the address changes after the nonce is issued", async () => {
    await renderHarness()

    setMockAuthDelay("nonce", 10)

    const pending = act(async () => {
      const promise = handle.signIn()

      setSelection(readySelection(OTHER_ADDRESS))

      await promise
    })

    await pending
    await settle()

    expect(screen.getByTestId("error")).toHaveTextContent(/^WALLET_CHANGED$/)
    expect(screen.getByTestId("status")).toHaveTextContent(/^unauthenticated$/)
    expect(mockAuthState.requestCounts.verify).toBe(0)
  })

  it("aborts when the address changes while the wallet is signing", async () => {
    await renderHarness()

    signMessageImpl = async ({ message }) => {
      setSelection(readySelection(OTHER_ADDRESS))

      return signMockMessage(message)
    }

    await signIn()

    expect(screen.getByTestId("error")).toHaveTextContent(/^WALLET_CHANGED$/)
    expect(screen.getByTestId("status")).toHaveTextContent(/^unauthenticated$/)
    expect(mockAuthState.requestCounts.verify).toBe(0)
  })

  it("aborts when only the chain changes during the operation", async () => {
    await renderHarness()

    signMessageImpl = async ({ message }) => {
      setSelection(readySelection(ADDRESS, 1))

      return signMockMessage(message)
    }

    await signIn()

    expect(screen.getByTestId("error")).toHaveTextContent(/^WALLET_CHANGED$/)
    expect(screen.getByTestId("status")).toHaveTextContent(/^unauthenticated$/)
  })
})

describe("response ownership", () => {
  it("rejects a verify response bound to a different address", async () => {
    await renderHarness()

    // Wallet signed with a different address than the address in the message: mock backend refused,
    // and the frontend guard also does not allow commits.
    // Sign with a key different from the address written in the message.
    signMessageImpl = ({ message }) => signMockMessage(message, mockOtherSigner)

    await signIn()

    expect(screen.getByTestId("status")).toHaveTextContent(/^unauthenticated$/)
    expect(screen.getByTestId("error")).toHaveTextContent(
      "SIWE_VERIFY_REJECTED",
    )
  })

  it("does not commit a verify response that arrives after logout", async () => {
    await renderHarness()

    // Log in once to have a session, then start a new login with slow verification.
    await signIn()

    setMockAuthDelay("verify", 20)

    await act(async () => {
      const promise = handle.signIn()

      await handle.logout()
      await promise
    })

    expect(screen.getByTestId("status")).toHaveTextContent(/^unauthenticated$/)
  })

  it("ignores a duplicate submit while a login is in flight", async () => {
    await renderHarness()

    setMockAuthDelay("nonce", 10)

    await act(async () => {
      await Promise.all([handle.signIn(), handle.signIn(), handle.signIn()])
    })

    await settle()

    expect(mockAuthState.requestCounts.nonce).toBe(1)
    expect(screen.getByTestId("status")).toHaveTextContent(/^authenticated$/)
  })
})

describe("backend failures", () => {
  it("surfaces a nonce failure without signing", async () => {
    setMockAuthFailureMode("nonce", "server-error")

    await renderHarness()
    await signIn()

    expect(screen.getByTestId("error")).toHaveTextContent(
      "NONCE_REQUEST_FAILED",
    )
    expect(screen.getByTestId("status")).toHaveTextContent(/^unauthenticated$/)
  })

  it("distinguishes verify unavailability from rejection", async () => {
    await renderHarness()

    setMockAuthFailureMode("verify", "server-error")

    await signIn()

    expect(screen.getByTestId("error")).toHaveTextContent(
      /^SIWE_VERIFY_FAILED$/,
    )
  })
})
