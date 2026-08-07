import { createFileRoute } from "@tanstack/react-router"

import Page from "@/pages/errors/500"

export const Route = createFileRoute("/500")({
  component: Page,
})
