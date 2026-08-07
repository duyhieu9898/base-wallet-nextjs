import { createFileRoute } from "@tanstack/react-router"

import Page from "@/pages/errors/401"

export const Route = createFileRoute("/401")({
  component: Page,
})
