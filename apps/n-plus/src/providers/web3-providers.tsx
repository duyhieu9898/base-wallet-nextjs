import type { ReactNode } from "react"

import { evmRuntimeConfig } from "@/config/web3.config"
import { EvmProvider } from "@nln/web3-evm/provider"

type Web3ProvidersProps = {
  children: ReactNode
}

export function Web3Providers({ children }: Web3ProvidersProps) {
  // Application composes additional implemented chain-family providers here,
  // and owns both the runtime config and the hosting options it passes down.
  //
  // `ssr: false` because this is a static SPA. The flag carried `true` from when
  // the application was a Next.js host; the Vite migration removed the server
  // render but left the option behind. With `ssr: true` Wagmi assumes the first
  // render happens on a server and defers reading persisted state until after
  // hydration, which shows a connected wallet as disconnected for one frame on
  // every load.
  return (
    <EvmProvider runtimeConfig={evmRuntimeConfig} options={{ ssr: false }}>
      {children}
    </EvmProvider>
  )
}
