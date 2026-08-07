import { createFileRoute } from "@tanstack/react-router"

import Page from "@/pages/errors/404"

export const Route = createFileRoute("/404")({
  component: Page,
})
