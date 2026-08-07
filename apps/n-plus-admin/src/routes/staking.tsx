import { createFileRoute } from "@tanstack/react-router"

import Page from "@/pages/staking"

export const Route = createFileRoute("/staking")({
  component: Page,
})
