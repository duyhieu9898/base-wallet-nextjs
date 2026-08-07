import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { LazyTree, type LazyTreePage } from "./lazy-tree"

/**
 * A node shape sharing nothing with the MLM one — different field names, no
 * wallet, no status. If the tree can drive this, it carries no domain knowledge,
 * which is the whole claim behind putting it in `components/` rather than
 * `features/mlm/`.
 */
type Folder = {
  key: string
  label: string
  expandable: boolean
}

function folder(key: string, expandable = false): Folder {
  return { key, label: `Folder ${key}`, expandable }
}

describe("LazyTree", () => {
  it("drives a node shape it knows nothing about", async () => {
    const user = userEvent.setup()

    const levels: Record<string, Folder[]> = {
      root: [folder("a", true), folder("b")],
      a: [folder("a1")],
    }

    const loadChildren = vi.fn(
      (parentId: string, page: number): Promise<LazyTreePage<Folder>> => {
        const all = levels[parentId] ?? []
        return Promise.resolve({
          children: all,
          meta: { currentPage: page, perPage: 10, total: all.length },
        })
      },
    )

    render(
      <LazyTree
        root={folder("root", true)}
        getId={(node) => node.key}
        getHasChildren={(node) => node.expandable}
        getLabel={(node) => node.label}
        loadChildren={loadChildren}
        renderNode={(node) => <span>{node.label}</span>}
      />,
    )

    expect(await screen.findByText("Folder a")).toBeInTheDocument()
    expect(screen.getByText("Folder b")).toBeInTheDocument()

    // `b` is not expandable, so it gets no control; `a` is.
    expect(
      screen.queryByRole("button", { name: /Folder b/i }),
    ).not.toBeInTheDocument()

    await user.click(
      screen.getByRole("button", { name: /expand downlines of Folder a/i }),
    )

    expect(await screen.findByText("Folder a1")).toBeInTheDocument()
    expect(
      loadChildren.mock.calls.map(([id, page]) => `${id}:${page}`),
    ).toEqual(["root:1", "a:1"])
  })

  it("passes an abort signal the caller can forward to fetch", async () => {
    const signals: (AbortSignal | undefined)[] = []
    const loadChildren = vi.fn(
      (
        _parentId: string,
        page: number,
        signal?: AbortSignal,
      ): Promise<LazyTreePage<Folder>> => {
        signals.push(signal)
        return Promise.resolve({
          children: [],
          meta: { currentPage: page, perPage: 10, total: 0 },
        })
      },
    )

    const { unmount } = render(
      <LazyTree
        root={folder("root", true)}
        getId={(node) => node.key}
        getHasChildren={(node) => node.expandable}
        loadChildren={loadChildren}
        renderNode={(node) => <span>{node.label}</span>}
      />,
    )

    await vi.waitFor(() => expect(signals).toHaveLength(1))
    expect(signals[0]?.aborted).toBe(false)

    unmount()
    expect(signals[0]?.aborted).toBe(true)
  })
})
