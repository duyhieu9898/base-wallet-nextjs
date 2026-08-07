import { createFileRoute } from "@tanstack/react-router"

import Page from "@/pages/maintenance"

export const Route = createFileRoute("/maintenance")({
  component: Page,
})
