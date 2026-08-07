import { createFileRoute } from "@tanstack/react-router"

import Page from "@/pages/admins"

export const Route = createFileRoute("/admins")({
  component: Page,
})
