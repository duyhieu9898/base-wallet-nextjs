import { createContext, useContext, type ReactNode } from "react"

/**
 * Chain that on-chain identifiers in this subtree belong to.
 *
 * The cells need a chain to build an explorer URL, but a shared UI package must
 * not read one consumer's config module — an admin console that points at
 * mainnet and one that points at a testnet differ only in what they provide
 * here. The application supplies the value once, at its shell.
 *
 * Absent provider resolves to `null` rather than a default chain: rendering an
 * identifier as plain text is recoverable, linking it to the wrong explorer is
 * not.
 */
const ExplorerChainContext = createContext<number | null>(null)

export function ExplorerChainProvider({
  chainId,
  children,
}: {
  chainId: number
  children: ReactNode
}) {
  return (
    <ExplorerChainContext.Provider value={chainId}>
      {children}
    </ExplorerChainContext.Provider>
  )
}

export function useExplorerChainId(): number | null {
  return useContext(ExplorerChainContext)
}
