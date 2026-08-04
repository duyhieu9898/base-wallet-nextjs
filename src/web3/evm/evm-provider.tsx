"use client"

import type { ReactNode } from "react"
import { WagmiProvider } from "wagmi"

import { wagmiConfig } from "./config"

type EvmProviderProps = {
  children: ReactNode
}

export function EvmProvider({ children }: EvmProviderProps) {
  return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
}
