"use client"

import type { ReactNode } from "react"

import { useAuth } from "@/features/auth/hooks/use-auth"
import { useAuthenticatedWallet } from "@/features/auth/hooks/use-authenticated-wallet"
import { WalletBindingModal } from "./wallet-binding-modal"

export type AuthWalletBindingGateProps = {
  children: ReactNode
}

/**
 * Locking the application when the wallet is connecting does not match the session.
 *
 * Children are still rendered below the modal — keeping the component tree alive allowing itself
 * Unlock as soon as the user transfers the correct wallet: no need to re-sign, no loss
 * state of the page.
 *
 * Four layers of blocking, intentionally not relying on any one layer:
 *
 * 1. `inert` is set by the gate itself — locks both the pointer and keyboard for the entire tree
 *    behind. Base UI does NOT set `inert` itself (it just puts `aria-hidden` on
 *    background container), so if this line is missing, the background can still be accessed by pressing Tab.
 * 2. `aria-hidden` set by Base UI — assistive tech cannot read the background.
 * 3. Base UI focus trap — Tab does not exit the modal.
 * 4. `assertAuthenticatedWalletBinding()` at the domain layer — real guard, still blocking
 *    when everything above is bypassed.
 *
 * The wrapper uses `display: contents` to not add a layout box; `inert`
 * still applies to the entire subtree because it is independent of display.
 */
export function AuthWalletBindingGate({
  children,
}: AuthWalletBindingGateProps) {
  const { logout, isLoggingOut, logoutError } = useAuth()
  const { binding, isBlocking } = useAuthenticatedWallet()
  const blockingBinding =
    binding.status === "wallet-mismatched" ||
    binding.status === "wallet-disconnected"
      ? binding
      : null

  return (
    <>
      <div style={{ display: "contents" }} inert={isBlocking}>
        {children}
      </div>

      {blockingBinding && (
        <WalletBindingModal
          binding={blockingBinding}
          onLogout={() => {
            void logout()
          }}
          isLoggingOut={isLoggingOut}
          logoutErrorMessage={logoutError?.message ?? null}
        />
      )}
    </>
  )
}
