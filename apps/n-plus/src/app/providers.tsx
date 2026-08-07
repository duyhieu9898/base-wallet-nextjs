"use client"

import type { ReactNode } from "react"

import { AuthBootstrapBoundary } from "@/features/auth/components/auth-bootstrap-boundary"
import { AuthWalletBindingGate } from "@/features/auth/components/auth-wallet-binding-gate"
import { AuthRuntimeProvider } from "@/features/auth/runtime/auth-runtime-provider"
import { I18nProvider } from "@/i18n/i18n-provider"
import { MockProvider } from "@/providers/mock-provider"
import { QueryProvider } from "@/providers/query-provider"
import { TransactionFeedbackProvider } from "@/components/web3/common/transaction-feedback"
import { Web3Providers } from "@/providers/web3-providers"

type ProvidersProps = {
  children: ReactNode
}

/**
 * Provider order is a constraint, not a preference:
 *
 * - `AuthRuntimeProvider` is in `QueryProvider` to clean up user-scoped cache when
 *   logout;
 * - and located in `Web3Providers` so `useSiweLogin()` uses EVM selection and
 *   wallet signing;
 * - `AuthBootstrapBoundary` blocks the application until the session has concluded, so
 *   it must cover the rest;
 * - `AuthWalletBindingGate` is in `AuthRuntimeProvider` because it reads auth state.
 *
 * Auth intentionally NOT added to `src/providers/web3-providers.tsx`: Web3 foundation
 * is reusable and must not depend back on application auth.
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <I18nProvider>
      <MockProvider>
        <QueryProvider>
          <Web3Providers>
            <AuthRuntimeProvider>
              <TransactionFeedbackProvider>
                <AuthBootstrapBoundary>
                  <AuthWalletBindingGate>{children}</AuthWalletBindingGate>
                </AuthBootstrapBoundary>
              </TransactionFeedbackProvider>
            </AuthRuntimeProvider>
          </Web3Providers>
        </QueryProvider>
      </MockProvider>
    </I18nProvider>
  )
}
