import { render, screen } from "@testing-library/react"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { describe, expect, it } from "vitest"

import { sidebarData } from "@/components/layout/data/sidebar-data"

import { AdminShell } from "./authenticated-layout"

/**
 * Composition test for the shell.
 *
 * The parts most likely to break silently are the ones that only fail at render:
 * router hooks, and the context providers that must wrap the sidebar. A build
 * that compiles proves neither — mounting it does.
 *
 * The shell reads `useLocation` and `useNavigate`, so it cannot mount outside a
 * router. This builds a throwaway one over memory history rather than mocking
 * the router module: a mock would let a wrong hook signature pass, which is the
 * exact class of failure this test exists to catch.
 */
async function renderShell() {
  const rootRoute = createRootRoute({
    component: () => (
      <AdminShell>
        <main>content</main>
      </AdminShell>
    ),
  })

  // Every sidebar destination needs a real route, otherwise the router cannot
  // resolve the `to` props into hrefs and the link assertions below are vacuous.
  const paths = new Set<string>(["/"])
  for (const group of sidebarData.navGroups) {
    for (const item of group.items) {
      if (item.url) paths.add(item.url)
      for (const sub of item.items ?? []) {
        if (sub.url) paths.add(sub.url)
      }
    }
  }

  const router = createRouter({
    routeTree: rootRoute.addChildren(
      [...paths].map((path) =>
        createRoute({
          getParentRoute: () => rootRoute,
          path,
          component: () => null,
        }),
      ),
    ),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })

  // RouterProvider renders nothing until the router has resolved its initial
  // match. Without this the tree is empty and every assertion below fails for
  // the wrong reason.
  await router.load()

  return render(<RouterProvider router={router} />)
}

describe("AdminShell", () => {
  it("mounts with its providers and renders the page content", async () => {
    await renderShell()
    expect(screen.getByText("content")).toBeInTheDocument()
  })

  it("renders every navigation group and destination from sidebar-data", async () => {
    await renderShell()

    for (const group of sidebarData.navGroups) {
      expect(screen.getAllByText(group.title).length).toBeGreaterThan(0)
      for (const item of group.items) {
        expect(screen.getAllByText(item.title).length).toBeGreaterThan(0)
      }
    }
  })

  it("resolves navigation into real hrefs", async () => {
    await renderShell()

    // A destination the router cannot resolve renders an anchor without an
    // href — the link looks right and navigates nowhere.
    const dashboard = screen.getAllByRole("link", { name: /dashboard/i })[0]
    expect(dashboard).toHaveAttribute("href", "/")
  })

  it("owns the header, so pages do not each render their own", async () => {
    await renderShell()

    // The header used to be copied into all eleven pages. Asserting the shell
    // renders exactly one keeps a page from quietly adding a second.
    expect(screen.getAllByRole("banner")).toHaveLength(1)
    expect(
      screen.getAllByRole("button", { name: /toggle theme/i }),
    ).toHaveLength(1)
  })

  it("shows the operator identity without an account menu", async () => {
    await renderShell()

    expect(screen.getByText(sidebarData.user.name)).toBeInTheDocument()
    // Admin auth is a separate candidate (§6.4); the template's sign-out and
    // billing entries were deliberately not carried over.
    expect(screen.queryByText(/sign out/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/upgrade to pro/i)).not.toBeInTheDocument()
  })
})
