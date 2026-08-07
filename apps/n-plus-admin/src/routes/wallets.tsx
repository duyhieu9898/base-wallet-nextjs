import { createFileRoute } from "@tanstack/react-router"

import Page from "@/pages/wallets"

export const Route = createFileRoute("/wallets")({
  component: Page,
})
