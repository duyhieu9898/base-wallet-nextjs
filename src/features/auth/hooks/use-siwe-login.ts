"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSignMessage } from "wagmi"
import type { Address } from "viem"

import { getAuthConfig } from "@/config/auth.config"
import { requestSiweNonce, verifySiwe } from "@/features/auth/api/auth-api"
import {
  createAuthError,
  toSignatureAuthError,
  toUnexpectedAuthError,
  type AuthError,
} from "@/features/auth/domain/auth-error"
import { canStartLogin } from "@/features/auth/domain/auth-state"
import { buildSiweMessage } from "@/features/auth/domain/siwe-message"
import { useAuthRuntime } from "@/features/auth/runtime/auth-runtime-context"
import { useSingleFlight } from "@/hooks/use-single-flight"
import type { EvmSelection } from "@/web3/evm/selection/evm-selection"
import { isSameAddress } from "@/web3/core/address.utils"
import { useEvmSelection } from "@/web3/evm/selection/use-evm-selection"

/**
 * Immutable snapshot of the condition at login start.
 *
 * All subsequent steps read from this snapshot and do not read the account again from closure: middle
 * When asking for a nonce and when signing, users can change wallets in the extension.
 */
export type SiweLoginSnapshot = {
  operationGeneration: number
  walletAddress: Address
  chainId: number
  domain: string
  uri: string
}

export type UseSiweLoginResult = {
  signIn(): Promise<void>
  /** True when both the wallet and session are in a state that allows signing to begin. */
  canSignIn: boolean
  isPending: boolean
  error: AuthError | null
  reset(): void
}

function assertSelectionReady(
  selection: EvmSelection,
): asserts selection is Extract<EvmSelection, { status: "ready" }> {
  if (selection.status === "ready") {
    return
  }

  if (selection.status === "unsupported") {
    throw createAuthError(
      "UNSUPPORTED_NETWORK",
      "Wallet is on an unsupported network. Switch to a supported EVM network and try again.",
    )
  }

  if (selection.status === "connecting") {
    throw createAuthError(
      "WALLET_NOT_READY",
      "Wallet is still connecting. Please wait a moment.",
    )
  }

  throw createAuthError(
    "WALLET_DISCONNECTED",
    "Connect a wallet before signing in.",
  )
}

const WALLET_CHANGED_ERROR = () =>
  createAuthError(
    "WALLET_CHANGED",
    "The wallet or network changed during sign-in. Please sign again.",
  )

/**
 * Orchestrate the SIWE login stream.
 *
 * Hooks contain no UI and do not render anything themselves: the presentation decides what to display
 * How, the hook is only responsible for keeping the order and guards correct.
 *
 * The hook is outside of `AuthRuntimeProvider` (instead of the action of the context) because it is needed
 * Wagmi's wallet hook, the provider must be able to mount it even when EVM is turned off.
 */
export function useSiweLogin(): UseSiweLoginResult {
  const runtime = useAuthRuntime()
  const selection = useEvmSelection()
  const { mutateAsync: signMessageAsync } = useSignMessage()

  const { run, isPending } = useSingleFlight()
  const [error, setError] = useState<AuthError | null>(null)

  // Latest selection read through ref: async steps must compare to wallet state
  // The *current* state, not the frozen state in the render closure
  // Start logging in.
  //
  // Write in the effect, not the render — the render must be pure. Wallet
  // Changes always involve a commit, so the ref is updated before the next async step
  // keep running.
  const selectionRef = useRef(selection)

  useEffect(() => {
    selectionRef.current = selection
  }, [selection])

  const assertSnapshotStillValid = useCallback(
    (snapshot: SiweLoginSnapshot) => {
      if (!runtime.isOperationCurrent(snapshot.operationGeneration)) {
        // Logout or a new login attempt has begun.
        throw WALLET_CHANGED_ERROR()
      }

      const current = selectionRef.current

      if (
        current.status !== "ready" ||
        current.chainId !== snapshot.chainId ||
        !isSameAddress(current.account, snapshot.walletAddress)
      ) {
        throw WALLET_CHANGED_ERROR()
      }
    },
    [runtime],
  )

  const signIn = useCallback(async () => {
    // Do not open a signing stream without knowing whether there is a session or not (`bootstrapping`),
    // and do not overwrite an existing session. No-op is silent because this is a living copy
    // Logical layer of the button being disabled — not an error to report to the user.
    if (!canStartLogin(runtime.state)) {
      return
    }

    await run(async () => {
      setError(null)

      let snapshot: SiweLoginSnapshot | null = null

      try {
        const readySelection = selectionRef.current

        assertSelectionReady(readySelection)

        const config = getAuthConfig()

        snapshot = {
          // New generation begins here: all old auth operations become stale.
          operationGeneration: runtime.beginLogin(readySelection.account),
          walletAddress: readySelection.account,
          chainId: readySelection.chainId,
          domain: config.siweDomain,
          uri: config.siweUri,
        }

        const nonce = await requestSiweNonce({
          walletAddress: snapshot.walletAddress,
          chainId: snapshot.chainId,
        })

        assertSnapshotStillValid(snapshot)

        const message = buildSiweMessage({
          domain: snapshot.domain,
          address: snapshot.walletAddress,
          uri: snapshot.uri,
          chainId: snapshot.chainId,
          nonce: nonce.nonce,
          issuedAt: nonce.issuedAt,
          expirationTime: nonce.expirationTime,
          statement: config.siweStatement,
        })

        // Check again just before opening your wallet: this is the last moment left
        // receive a signature associated with the redeemed wallet.
        assertSnapshotStillValid(snapshot)

        let signature: `0x${string}`

        try {
          signature = await signMessageAsync({ message })
        } catch (cause) {
          throw toSignatureAuthError(cause)
        }

        assertSnapshotStillValid(snapshot)

        const payload = await verifySiwe({ message, signature })

        // The backend must return the correct signed wallet. No match means the session will bind
        // to a different identity — reject commit instead of sending response.
        if (
          !isSameAddress(payload.user.walletAddress, snapshot.walletAddress)
        ) {
          throw createAuthError(
            "SIWE_VERIFY_REJECTED",
            "The returned session does not match the wallet that signed.",
          )
        }

        assertSnapshotStillValid(snapshot)

        runtime.commitLogin(payload, snapshot.operationGeneration)
      } catch (cause) {
        // `toSignatureAuthError` is only used around the signature call (see above).
        // This should be a neutral fallback: a strange error in the build message or
        // when verify is not a "signing failure".
        setError(toUnexpectedAuthError(cause))

        if (snapshot !== null) {
          // Take auth state out of `authenticating`. Ignored if generation has already occurred
          // stale — then a newer operation owns the state.
          runtime.abortLogin(snapshot.operationGeneration)
        }
      }
    })
  }, [assertSnapshotStillValid, run, runtime, signMessageAsync])

  return {
    signIn,
    canSignIn:
      selection.status === "ready" &&
      !isPending &&
      canStartLogin(runtime.state),
    isPending,
    error,
    reset: useCallback(() => {
      setError(null)
    }, []),
  }
}
