import type { Address } from "viem"

import { isSameAddress } from "@nln/web3-evm/address"
import type { EvmSelection } from "@nln/web3-evm"
import { createAuthError } from "./auth-error"
import type { AuthState } from "./auth-state"

/**
 * The relationship between the session address (signed and verified by the backend) and the wallet is
 * connect.
 *
 * `not-applicable` means there is no session to bind, not "valid".
 */
export type WalletBinding =
  | { status: "not-applicable" }
  | { status: "checking"; sessionAddress: Address }
  | { status: "matched"; sessionAddress: Address; connectedAddress: Address }
  | { status: "wallet-disconnected"; sessionAddress: Address }
  | {
      status: "wallet-mismatched"
      sessionAddress: Address
      connectedAddress: Address
    }

export type DeriveWalletBindingInput = {
  authState: AuthState
  evmSelection: EvmSelection
}

/**
 * Pure derivation — components never compare addresses themselves.
 *
 * Binding only cares about **address**. Unsupported chain is still a matter of
 * EVM selection guard: changing network does not invalidate the session, so it does not
 * manifested as wallet mismatch.
 */
export function deriveWalletBinding({
  authState,
  evmSelection,
}: DeriveWalletBindingInput): WalletBinding {
  if (authState.status !== "authenticated") {
    return { status: "not-applicable" }
  }

  const sessionAddress = authState.user.walletAddress

  if (evmSelection.status === "connecting") {
    return { status: "checking", sessionAddress }
  }

  const connectedAddress = evmSelection.account

  if (connectedAddress === null) {
    return { status: "wallet-disconnected", sessionAddress }
  }

  if (!isSameAddress(sessionAddress, connectedAddress)) {
    return { status: "wallet-mismatched", sessionAddress, connectedAddress }
  }

  return { status: "matched", sessionAddress, connectedAddress }
}

/** Binding allows the application to run normally. */
export function isWalletBindingSatisfied(binding: WalletBinding): boolean {
  return binding.status === "matched" || binding.status === "not-applicable"
}

/** Binding must lock the entire application using blocking modal. */
export function isWalletBindingBlocking(binding: WalletBinding): boolean {
  return (
    binding.status === "wallet-mismatched" ||
    binding.status === "wallet-disconnected"
  )
}

export type AssertAuthenticatedWalletBindingInput = {
  authState: AuthState
  walletBinding: WalletBinding
}

/**
 * Domain guard cho protected action.
 *
 * Blocking modal is presentation and not the only safety guard: component
 * can be called programmatically, a focus/keyboard bug can get through
 * overlay, and future testing or UI can completely bypass the display layer.
 *
 * Return matched binding instead of using `asserts`: TypeScript does not allow it
 * type predicate refers to the property in the destructuring pattern, and the value
 * The return value is also more convenient — protected actions often require a `sessionAddress` itself.
 */
export function assertAuthenticatedWalletBinding({
  authState,
  walletBinding,
}: AssertAuthenticatedWalletBindingInput): Extract<
  WalletBinding,
  { status: "matched" }
> {
  if (authState.status !== "authenticated") {
    throw createAuthError(
      "AUTH_REQUIRED",
      "This action requires signing in with a wallet.",
    )
  }

  if (walletBinding.status === "wallet-disconnected") {
    throw createAuthError(
      "AUTH_WALLET_DISCONNECTED",
      "Wallet is disconnected. Reconnect the session wallet to continue.",
    )
  }

  // `checking` means you don't know which wallet is connecting. Don't know yet
  // is allowed — guard blocks until selection resolves.
  if (walletBinding.status === "checking") {
    throw createAuthError(
      "AUTH_WALLET_DISCONNECTED",
      "Wallet is not ready yet. Wait for it to connect and try again.",
    )
  }

  if (walletBinding.status !== "matched") {
    throw createAuthError(
      "AUTH_WALLET_MISMATCH",
      "The connected wallet does not match your session.",
    )
  }

  return walletBinding
}
