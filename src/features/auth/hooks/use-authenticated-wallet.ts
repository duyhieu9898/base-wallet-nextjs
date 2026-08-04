"use client"

import { useMemo } from "react"

import {
  assertAuthenticatedWalletBinding,
  deriveWalletBinding,
  isWalletBindingBlocking,
  isWalletBindingSatisfied,
  type WalletBinding,
} from "@/features/auth/domain/wallet-binding"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useEvmSelection } from "@/web3/evm/selection/use-evm-selection"

export type UseAuthenticatedWalletResult = {
  binding: WalletBinding
  /** Application is allowed to run normally. */
  isSatisfied: boolean
  /** Must block application using blocking modal. */
  isBlocking: boolean
  /**
   * Guard for protected action. Throw `AuthError` when session does not exist
   * or wallets do not match.
   */
  assertReady(): void
}

/**
 * Connect auth state to EVM selection.
 *
 * Derivation is a pure function at the domain layer — the hook just reads the two sources and calls it.
 * Components never compare addresses themselves.
 */
export function useAuthenticatedWallet(): UseAuthenticatedWalletResult {
  const { state } = useAuth()
  const evmSelection = useEvmSelection()

  const binding = useMemo(
    () => deriveWalletBinding({ authState: state, evmSelection }),
    [evmSelection, state],
  )

  return {
    binding,
    isSatisfied: isWalletBindingSatisfied(binding),
    isBlocking: isWalletBindingBlocking(binding),
    assertReady: () => {
      assertAuthenticatedWalletBinding({
        authState: state,
        walletBinding: binding,
      })
    },
  }
}
