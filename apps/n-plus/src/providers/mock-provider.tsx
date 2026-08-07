import { useEffect, useState, type ReactNode } from "react"

type MockProviderProps = {
  children: ReactNode
}

const isMockingEnabled = import.meta.env.VITE_API_MOCKING === "enabled"

/**
 * Only start the MSW worker when `VITE_API_MOCKING=enabled`. Worker okay
 * dynamic import to not include mock code in the bundle when mocking is disabled.
 *
 * Delay app rendering until the worker is ready for the first auth query to hit
 * handler instead of calling the real backend that doesn't exist yet.
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
        console.error("Unable to start MSW worker:", error)

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
        Preparing the development environment...
      </div>
    )
  }

  return children
}
