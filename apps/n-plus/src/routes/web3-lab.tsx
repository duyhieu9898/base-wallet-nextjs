import { createFileRoute, notFound } from "@tanstack/react-router"
import { useEffect } from "react"

import Web3LabPage from "@/pages/web3-lab"

/**
 * Development-only route. The gate is in `beforeLoad`, which runs before the
 * route's component chunk is fetched, so in production the lab never renders and
 * its code is never loaded.
 *
 * It is still emitted as a chunk in the production build — `beforeLoad` is a
 * runtime check, not a build-time exclusion. Reachable only by someone who
 * requests the asset directly; it contains no secrets, only development UI.
 * Removing it from the output entirely would need a build-level exclusion.
 */
export const Route = createFileRoute("/web3-lab")({
  beforeLoad: () => {
    if (import.meta.env.PROD) throw notFound()
  },
  component: Web3LabRoute,
})

/**
 * The App Router set a per-page title through route metadata. A static bundle
 * has one <title> in index.html, so the route sets and restores it itself.
 */
function Web3LabRoute() {
  useEffect(() => {
    const previous = document.title
    document.title = "Web3 Lab"

    return () => {
      document.title = previous
    }
  }, [])

  return <Web3LabPage />
}
