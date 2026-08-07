import { createFileRoute, notFound } from "@tanstack/react-router"

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
  component: Web3LabPage,
})
