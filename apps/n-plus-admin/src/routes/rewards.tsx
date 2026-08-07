import { createFileRoute } from "@tanstack/react-router"

import Page from "@/pages/rewards"

export const Route = createFileRoute("/rewards")({
  component: Page,
})
