import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { OrganizationTree } from "./organization-tree"
import type {
  OrganizationDescendantsResponse,
  OrganizationNode,
} from "./organization-tree.types"

const ROOT: OrganizationNode = {
  positionId: "pos-root",
  referralCode: "SYSTEM-ROOT",
  status: "Active",
  walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  hasChildren: true,
}

function node(id: string, hasChildren = false): OrganizationNode {
  return {
    positionId: id,
    referralCode: `CODE-${id}`,
    status: "Active",
    walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    hasChildren,
  }
}

/**
 * Serve one level at a time, keyed by position ID, so a test can assert what was
 * fetched and when — the point of the component is that it does *not* hold the
 * whole tree.
 */
function mockApi(
  levels: Record<string, OrganizationNode[]>,
  perPage = 2,
): { calls: string[] } {
  const calls: string[] = []

  vi.stubGlobal(
    "fetch",
    vi.fn((input: string | URL) => {
      const url = new URL(String(input))
      const positionId = decodeURIComponent(
        url.pathname.split("/positions/")[1].split("/")[0],
      )
      const page = Number(url.searchParams.get("page") ?? "1")
      calls.push(`${positionId}:${page}`)

      const all = levels[positionId] ?? []
      const start = (page - 1) * perPage
      const body: OrganizationDescendantsResponse = {
        children: all.slice(start, start + perPage),
        meta: { currentPage: page, perPage, total: all.length },
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(body),
      } as Response)
    }),
  )

  return { calls }
}

describe("OrganizationTree", () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it("loads the root's first page on mount", async () => {
    const { calls } = mockApi({
      "pos-root": [node("a"), node("b")],
    })

    render(<OrganizationTree root={ROOT} onSelectNode={() => {}} />)

    expect(await screen.findByText("CODE-a")).toBeInTheDocument()
    expect(screen.getByText("CODE-b")).toBeInTheDocument()
    expect(calls).toEqual(["pos-root:1"])
  })

  it("fetches a branch's children only when it is expanded", async () => {
    const user = userEvent.setup()
    const { calls } = mockApi({
      "pos-root": [node("a", true)],
      a: [node("a1")],
    })

    render(<OrganizationTree root={ROOT} onSelectNode={() => {}} />)
    await screen.findByText("CODE-a")

    // Child level is untouched until the admin asks for it.
    expect(calls).toEqual(["pos-root:1"])
    expect(screen.queryByText("CODE-a1")).not.toBeInTheDocument()

    await user.click(
      screen.getByRole("button", { name: /expand downlines of CODE-a/i }),
    )

    expect(await screen.findByText("CODE-a1")).toBeInTheDocument()
    expect(calls).toEqual(["pos-root:1", "a:1"])
  })

  it("keeps loaded children when a branch is collapsed and reopened", async () => {
    const user = userEvent.setup()
    const { calls } = mockApi({
      "pos-root": [node("a", true)],
      a: [node("a1")],
    })

    render(<OrganizationTree root={ROOT} onSelectNode={() => {}} />)
    await screen.findByText("CODE-a")

    const toggle = screen.getByRole("button", {
      name: /expand downlines of CODE-a/i,
    })
    await user.click(toggle)
    await screen.findByText("CODE-a1")

    await user.click(
      screen.getByRole("button", { name: /collapse downlines of CODE-a/i }),
    )
    await waitFor(() =>
      expect(screen.queryByText("CODE-a1")).not.toBeInTheDocument(),
    )

    await user.click(
      screen.getByRole("button", { name: /expand downlines of CODE-a/i }),
    )
    expect(await screen.findByText("CODE-a1")).toBeInTheDocument()

    // Reopening must not refetch: the branch already holds page 1.
    expect(calls).toEqual(["pos-root:1", "a:1"])
  })

  it("appends the next page of siblings behind View more", async () => {
    const user = userEvent.setup()
    const { calls } = mockApi(
      { "pos-root": [node("a"), node("b"), node("c")] },
      2,
    )

    render(<OrganizationTree root={ROOT} onSelectNode={() => {}} />)
    await screen.findByText("CODE-a")

    expect(screen.queryByText("CODE-c")).not.toBeInTheDocument()
    expect(screen.getByText("2 of 3")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /view more/i }))

    expect(await screen.findByText("CODE-c")).toBeInTheDocument()
    // Appended, not replaced.
    expect(screen.getByText("CODE-a")).toBeInTheDocument()
    expect(screen.getByText("CODE-b")).toBeInTheDocument()
    expect(calls).toEqual(["pos-root:1", "pos-root:2"])
  })

  it("offers no View more when a level fits in one page", async () => {
    mockApi({ "pos-root": [node("a")] }, 2)

    render(<OrganizationTree root={ROOT} onSelectNode={() => {}} />)
    await screen.findByText("CODE-a")

    expect(
      screen.queryByRole("button", { name: /view more/i }),
    ).not.toBeInTheDocument()
  })

  it("shows no expand control on a leaf", async () => {
    mockApi({ "pos-root": [node("a", false)] })

    render(<OrganizationTree root={ROOT} onSelectNode={() => {}} />)
    await screen.findByText("CODE-a")

    expect(
      screen.queryByRole("button", { name: /expand downlines of CODE-a/i }),
    ).not.toBeInTheDocument()
  })

  it("surfaces a failed level load with a retry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false } as Response)),
    )

    render(<OrganizationTree root={ROOT} onSelectNode={() => {}} />)

    expect(
      await screen.findByText(/failed to load downlines/i),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument()
  })

  it("re-roots to the position whose referral code is clicked", async () => {
    const user = userEvent.setup()
    const onSelectNode = vi.fn()
    mockApi({ "pos-root": [node("a")] })

    render(<OrganizationTree root={ROOT} onSelectNode={onSelectNode} />)
    await screen.findByText("CODE-a")

    await user.click(screen.getByRole("button", { name: "CODE-a" }))

    expect(onSelectNode).toHaveBeenCalledWith("CODE-a")
  })
})
