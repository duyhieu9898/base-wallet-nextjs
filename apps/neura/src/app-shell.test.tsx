import { render, screen } from "@testing-library/react"
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { describe, expect, it } from "vitest"

import { routeTree } from "@/routeTree.gen"

/**
 * Mounts the real generated route tree, not a hand-built one, so this fails if
 * the router plugin stops emitting a route or if the provider composition in
 * `__root.tsx` throws. `RouterProvider` renders nothing until the router has
 * resolved, hence the `await router.load()`.
 */
describe("application shell", () => {
  it("renders the home route through the real route tree", async () => {
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ["/"] }),
    })

    await router.load()
    render(<RouterProvider router={router} />)

    expect(
      await screen.findByRole("heading", { level: 1, name: "Neura" }),
    ).toBeInTheDocument()
  })
})
