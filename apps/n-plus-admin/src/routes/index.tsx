import { createFileRoute } from "@tanstack/react-router"

import Page from "@/pages/dashboard"

export const Route = createFileRoute("/")({
  component: Page,
})
