"use client"

import { useEffect, useState, type ReactNode } from "react"

type MockProviderProps = {
  children: ReactNode
}

const isMockingEnabled = process.env.NEXT_PUBLIC_API_MOCKING === "enabled"

/**
 * Only start the MSW worker when `NEXT_PUBLIC_API_MOCKING=enabled`. Worker uses
 * dynamic import to avoid including mock code in production bundle when mocking is disabled.
 */
export function MockProvider({ children }: MockProviderProps) {
  const [ready, setReady] = useState(!isMockingEnabled)

  useEffect(() => {
    if (!isMockingEnabled) {
      return
    }

    let active = true

    void import("@/mocks/browser")
      .then(({ worker }) => {
        if (!active) {
          return
        }

        return worker.start({ onUnhandledRequest: "bypass" })
      })
      .then(() => {
        if (active) {
          setReady(true)
        }
      })
      .catch((error: unknown) => {
        console.error("Unable to start MSW worker for Admin:", error)

        if (active) {
          setReady(true)
        }
      })

    return () => {
      active = false
    }
  }, [])

  if (!ready) {
    return (
      <div className="text-muted-foreground flex min-h-screen items-center justify-center text-sm">
        Preparing N+ Admin mock development environment...
      </div>
    )
  }

  return children
}
