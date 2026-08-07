"use client"

import type { ReactNode } from "react"

import { evmRuntimeConfig } from "@/config/web3.config"
import { EvmProvider } from "@nln/web3-evm/provider"

type Web3ProvidersProps = {
  children: ReactNode
}

export function Web3Providers({ children }: Web3ProvidersProps) {
  // Application composes additional implemented chain-family providers here,
  // and owns both the runtime config and the hosting options it passes down.
  // `ssr: true` because this application is a Next.js host.
  return (
    <EvmProvider runtimeConfig={evmRuntimeConfig} options={{ ssr: true }}>
      {children}
    </EvmProvider>
  )
}
