import { describe, expect, it } from "vitest"
import type { Address } from "viem"

import {
  type EvmNetworkConfig,
  type EvmSelection,
  getDefaultEvmNetwork,
} from "@nln/web3-evm"
import type { AuthState } from "./auth-state"
import {
  assertAuthenticatedWalletBinding,
  deriveWalletBinding,
  isWalletBindingBlocking,
  isWalletBindingSatisfied,
} from "./wallet-binding"

const SESSION_ADDRESS = "0x086d9feCB2F117369fAbDB884eC6851b36595444" as Address
const SAME_ADDRESS_LOWERCASE = SESSION_ADDRESS.toLowerCase() as Address
const OTHER_ADDRESS = "0x1111111111111111111111111111111111111111" as Address

const network: EvmNetworkConfig = getDefaultEvmNetwork()
const chainId = network.chain.id

const authenticated: AuthState = {
  status: "authenticated",
  user: {
    id: "user_1",
    walletAddress: SESSION_ADDRESS,
    memberCode: "NP000001",
  },
  position: null,
  expiresIn: 900,
}

function readySelection(account: Address): EvmSelection {
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
  chainId,
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

function unsupportedSelection(account: Address | null): EvmSelection {
  return {
    status: "unsupported",
    account,
    walletChainId: 999_999,
    chainId: null,
    network: null,
    networks: [network],
  }
}

describe("deriveWalletBinding", () => {
  it("is not applicable while unauthenticated", () => {
    expect(
      deriveWalletBinding({
        authState: { status: "unauthenticated" },
        evmSelection: readySelection(OTHER_ADDRESS),
      }),
    ).toEqual({ status: "not-applicable" })
  })

  it("is not applicable while bootstrapping", () => {
    expect(
      deriveWalletBinding({
        authState: { status: "bootstrapping" },
        evmSelection: disconnectedSelection,
      }),
    ).toEqual({ status: "not-applicable" })
  })

  it("matches when the connected address equals the session address", () => {
    expect(
      deriveWalletBinding({
        authState: authenticated,
        evmSelection: readySelection(SESSION_ADDRESS),
      }),
    ).toEqual({
      status: "matched",
      sessionAddress: SESSION_ADDRESS,
      connectedAddress: SESSION_ADDRESS,
    })
  })

  it("matches across address casing differences", () => {
    const binding = deriveWalletBinding({
      authState: authenticated,
      evmSelection: readySelection(SAME_ADDRESS_LOWERCASE),
    })

    expect(binding.status).toBe("matched")
  })

  it("reports mismatch for a different connected address", () => {
    expect(
      deriveWalletBinding({
        authState: authenticated,
        evmSelection: readySelection(OTHER_ADDRESS),
      }),
    ).toEqual({
      status: "wallet-mismatched",
      sessionAddress: SESSION_ADDRESS,
      connectedAddress: OTHER_ADDRESS,
    })
  })

  it("reports disconnected when no wallet is connected", () => {
    expect(
      deriveWalletBinding({
        authState: authenticated,
        evmSelection: disconnectedSelection,
      }),
    ).toEqual({
      status: "wallet-disconnected",
      sessionAddress: SESSION_ADDRESS,
    })
  })

  it("reports checking while the wallet is still connecting", () => {
    expect(
      deriveWalletBinding({
        authState: authenticated,
        evmSelection: connectingSelection,
      }),
    ).toEqual({ status: "checking", sessionAddress: SESSION_ADDRESS })
  })

  it("stays matched on an unsupported chain with the same address", () => {
    const binding = deriveWalletBinding({
      authState: authenticated,
      evmSelection: unsupportedSelection(SESSION_ADDRESS),
    })

    expect(binding.status).toBe("matched")
  })

  it("reports mismatch on an unsupported chain with a different address", () => {
    const binding = deriveWalletBinding({
      authState: authenticated,
      evmSelection: unsupportedSelection(OTHER_ADDRESS),
    })

    expect(binding.status).toBe("wallet-mismatched")
  })
})

describe("wallet binding predicates", () => {
  it("classifies satisfied and blocking bindings", () => {
    expect(isWalletBindingSatisfied({ status: "not-applicable" })).toBe(true)
    expect(
      isWalletBindingSatisfied({
        status: "matched",
        sessionAddress: SESSION_ADDRESS,
        connectedAddress: SESSION_ADDRESS,
      }),
    ).toBe(true)

    expect(
      isWalletBindingBlocking({
        status: "wallet-mismatched",
        sessionAddress: SESSION_ADDRESS,
        connectedAddress: OTHER_ADDRESS,
      }),
    ).toBe(true)
    expect(
      isWalletBindingBlocking({
        status: "wallet-disconnected",
        sessionAddress: SESSION_ADDRESS,
      }),
    ).toBe(true)
    expect(
      isWalletBindingBlocking({
        status: "checking",
        sessionAddress: SESSION_ADDRESS,
      }),
    ).toBe(false)
  })
})

describe("assertAuthenticatedWalletBinding", () => {
  it("passes for a matched binding", () => {
    expect(() =>
      assertAuthenticatedWalletBinding({
        authState: authenticated,
        walletBinding: {
          status: "matched",
          sessionAddress: SESSION_ADDRESS,
          connectedAddress: SESSION_ADDRESS,
        },
      }),
    ).not.toThrow()
  })

  it("requires authentication first", () => {
    expect(() =>
      assertAuthenticatedWalletBinding({
        authState: { status: "unauthenticated" },
        walletBinding: { status: "not-applicable" },
      }),
    ).toThrowError(
      expect.objectContaining({ name: "AuthError", code: "AUTH_REQUIRED" }),
    )
  })

  it("blocks a mismatched wallet even without any modal rendered", () => {
    expect(() =>
      assertAuthenticatedWalletBinding({
        authState: authenticated,
        walletBinding: {
          status: "wallet-mismatched",
          sessionAddress: SESSION_ADDRESS,
          connectedAddress: OTHER_ADDRESS,
        },
      }),
    ).toThrowError(expect.objectContaining({ code: "AUTH_WALLET_MISMATCH" }))
  })

  it("blocks a disconnected wallet", () => {
    expect(() =>
      assertAuthenticatedWalletBinding({
        authState: authenticated,
        walletBinding: {
          status: "wallet-disconnected",
          sessionAddress: SESSION_ADDRESS,
        },
      }),
    ).toThrowError(
      expect.objectContaining({ code: "AUTH_WALLET_DISCONNECTED" }),
    )
  })

  it("blocks while the wallet is still being checked", () => {
    expect(() =>
      assertAuthenticatedWalletBinding({
        authState: authenticated,
        walletBinding: { status: "checking", sessionAddress: SESSION_ADDRESS },
      }),
    ).toThrowError(
      expect.objectContaining({ code: "AUTH_WALLET_DISCONNECTED" }),
    )
  })
})
