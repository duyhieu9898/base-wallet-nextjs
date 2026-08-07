import { createFileRoute } from "@tanstack/react-router"

import Page from "@/pages/lending"

export const Route = createFileRoute("/lending")({
  component: Page,
})
