"use client"

import type { ReactNode } from "react"

import { EvmProvider } from "@/web3/evm/evm-provider"

type Web3ProvidersProps = {
  children: ReactNode
}

export function Web3Providers({ children }: Web3ProvidersProps) {
  // Application composes additional implemented chain-family providers here.
  return <EvmProvider>{children}</EvmProvider>
}
