"use client"

import { useCallback, useRef, useState } from "react"

export type SingleFlight = {
  /**
   * Run `operation`, skipping new calls if the previous one did not complete.
   */
  run(operation: () => Promise<void>): Promise<void>
  isPending: boolean
}

/**
 * Prevent double-submit for an async action.
 *
 * There's nothing about auth here — any feature that has a submit button needs to be correct
 * this mechanism, so it is located in `src/hooks/` and not in a feature.
 *
 * Guard is `ref`, not `isPending`: the state only changes on the next render, so
 * Two consecutive calls within the same tick will get through based on state alone.
 * `isPending` exists specifically for the UI (disable button), not for guarding.
 *
 * Reset is in `finally` — one failure does not permanently lock the action
 * movement; The user must be able to retry.
 */
export function useSingleFlight(): SingleFlight {
  const inFlightRef = useRef(false)
  const [isPending, setIsPending] = useState(false)

  const run = useCallback(async (operation: () => Promise<void>) => {
    if (inFlightRef.current) {
      return
    }

    inFlightRef.current = true
    setIsPending(true)

    try {
      await operation()
    } finally {
      inFlightRef.current = false
      setIsPending(false)
    }
  }, [])

  return { run, isPending }
}
