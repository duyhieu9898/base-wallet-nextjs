import { createFileRoute } from "@tanstack/react-router"

import Page from "@/pages/errors/503"

export const Route = createFileRoute("/503")({
  component: Page,
})
