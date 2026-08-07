import { createFileRoute } from "@tanstack/react-router"

import Page from "@/pages/history"

export const Route = createFileRoute("/history")({
  component: Page,
})
