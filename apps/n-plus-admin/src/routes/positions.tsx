import { createFileRoute } from "@tanstack/react-router"

import Page from "@/pages/positions"

export const Route = createFileRoute("/positions")({
  component: Page,
})
