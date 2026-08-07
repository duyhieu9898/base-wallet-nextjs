"use client"

import { useState, type ReactNode } from "react"
import { WagmiProvider } from "wagmi"

import { configureEvmRuntime } from "../chain/registry/evm-runtime-config"
import type { EvmRuntimeConfig } from "../chain/registry/evm-runtime-config"
import {
  createWagmiConfig,
  type EvmProviderOptions,
} from "./wagmi-config.adapter"

type EvmProviderProps = {
  runtimeConfig: EvmRuntimeConfig
  options: EvmProviderOptions
  children: ReactNode
}

/**
 * Mount point for the EVM runtime.
 *
 * Installing the registry and creating the Wagmi config both happen inside a
 * lazy `useState` initializer, so they run once during this component's render
 * — before any child hook reads the registry — and never at module import.
 */
export function EvmProvider({
  runtimeConfig,
  options,
  children,
}: EvmProviderProps) {
  const [wagmiConfig] = useState(() => {
    configureEvmRuntime(runtimeConfig)
    return createWagmiConfig(runtimeConfig, options)
  })

  return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
}
