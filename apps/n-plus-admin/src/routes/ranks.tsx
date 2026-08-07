import { createFileRoute } from "@tanstack/react-router"

import Page from "@/pages/ranks"

export const Route = createFileRoute("/ranks")({
  component: Page,
})
