import { createFileRoute } from "@tanstack/react-router"

import Page from "@/pages/members"

export const Route = createFileRoute("/members")({
  component: Page,
})
