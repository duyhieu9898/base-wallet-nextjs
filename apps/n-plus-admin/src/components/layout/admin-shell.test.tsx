import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { sidebarData } from "@/components/layout/data/sidebar-data"

import { AdminShell } from "./authenticated-layout"

/**
 * Composition test for the ported shell.
 *
 * The shell came from a Vite + TanStack Router template and was rewritten for
 * the App Router. The parts most likely to have broken silently in that port are
 * the ones that only fail at render: router hooks replaced by next/navigation,
 * context providers that must wrap the sidebar, and client boundaries. A build
 * that compiles proves none of that — mounting it does.
 */

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

function renderShell() {
  return render(
    <AdminShell>
      <main>content</main>
    </AdminShell>,
  )
}

describe("AdminShell", () => {
  it("mounts with its providers and renders the page content", () => {
    renderShell()
    expect(screen.getByText("content")).toBeInTheDocument()
  })

  it("renders every navigation group and destination from sidebar-data", () => {
    renderShell()

    for (const group of sidebarData.navGroups) {
      expect(screen.getAllByText(group.title).length).toBeGreaterThan(0)
      for (const item of group.items) {
        expect(screen.getAllByText(item.title).length).toBeGreaterThan(0)
      }
    }
  })

  it("points navigation at hrefs, not at the template's router props", () => {
    renderShell()

    // A TanStack `to` prop left behind would render an anchor with no href, so
    // the link would look right and navigate nowhere.
    const dashboard = screen.getAllByRole("link", { name: /dashboard/i })[0]
    expect(dashboard).toHaveAttribute("href", "/")
  })

  it("owns the header, so pages do not each render their own", () => {
    renderShell()

    // The header used to be copied into all eleven pages. Asserting the shell
    // renders exactly one keeps a page from quietly adding a second.
    expect(screen.getAllByRole("banner")).toHaveLength(1)
    expect(
      screen.getAllByRole("button", { name: /toggle theme/i }),
    ).toHaveLength(1)
  })

  it("shows the operator identity without an account menu", () => {
    renderShell()

    expect(screen.getByText(sidebarData.user.name)).toBeInTheDocument()
    // Admin auth is a separate candidate (§6.4); the template's sign-out and
    // billing entries were deliberately not carried over.
    expect(screen.queryByText(/sign out/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/upgrade to pro/i)).not.toBeInTheDocument()
  })
})
