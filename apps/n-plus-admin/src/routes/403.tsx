import { createFileRoute } from "@tanstack/react-router"

import Page from "@/pages/errors/403"

export const Route = createFileRoute("/403")({
  component: Page,
})
