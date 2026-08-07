import { createFileRoute } from "@tanstack/react-router"

import { ForbiddenError } from "@/features/errors/forbidden-error"

export const Route = createFileRoute("/403")({
  component: ForbiddenError,
})
