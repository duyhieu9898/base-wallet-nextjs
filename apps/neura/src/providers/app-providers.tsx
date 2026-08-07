import { SolanaProvider } from "@nln/web3-solana/provider"
import type { ReactNode } from "react"

import { solanaRuntimeConfig } from "@/config/solana.config"
import { QueryProvider } from "@/providers/query-provider"

type ProvidersProps = {
  children: ReactNode
}

/**
 * Composition root.
 *
 * `SolanaProvider` sits inside `QueryProvider`, not above it: the runtime's read
 * hooks are TanStack Query consumers and cannot mount above their client.
 *
 * The runtime config is supplied here because this is where the application
 * chooses which chain family it runs on. The package holds no cluster data of
 * its own.
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <SolanaProvider runtimeConfig={solanaRuntimeConfig}>
        {children}
      </SolanaProvider>
    </QueryProvider>
  )
}
