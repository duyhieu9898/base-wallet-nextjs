import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronDown, Loader2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import styles from "./lazy-tree.module.css"

/**
 * Hierarchy view for a tree too large to load at once.
 *
 * Domain-free on purpose. It knows three things only: a node can be expanded, its
 * children arrive one page at a time, and a page may not be the last. Everything
 * else — what a node *is*, where children come from, how a node looks — is
 * supplied by the caller. That is what lets an admin org chart and a product-side
 * downline view share it without either one importing the other's API client or
 * design decisions.
 *
 * Two behaviours are the reason this is a component rather than a snippet:
 *
 * 1. **Children belong to the node that owns them.** No shared store, so
 *    expanding two branches cannot race or overwrite, and a collapsed branch
 *    keeps what it already fetched instead of refetching on reopen.
 * 2. **Siblings paginate.** A parent with hundreds of children loads a page at a
 *    time, and the load-more control sits inside the sibling row so it inherits
 *    the connector rail and reads as "the row continues".
 */

export type LazyTreePage<T> = {
  children: T[]
  meta: { currentPage: number; perPage: number; total: number }
}

export type LazyTreeProps<T> = {
  /** Node the view is rooted at. Changing it discards all expansion state. */
  root: T
  /** Stable identity — used as React key and passed to `loadChildren`. */
  getId: (node: T) => string
  /**
   * Whether a node can be expanded, known *before* its children are fetched.
   * A node that answers false renders no expand control at all.
   */
  getHasChildren: (node: T) => boolean
  /**
   * Fetch one page of a node's direct children.
   *
   * The signal is aborted when the node unmounts or supersedes the request, so a
   * caller that forwards it to `fetch` stops in-flight work rather than merely
   * discarding the result.
   */
  loadChildren: (
    parentId: string,
    page: number,
    signal?: AbortSignal,
  ) => Promise<LazyTreePage<T>>
  /** Render one node. The caller owns the card, its styling, and its actions. */
  renderNode: (node: T) => ReactNode
  /** Human-readable node name for the expand control's accessible label. */
  getLabel?: (node: T) => string
}

export function LazyTree<T>({ root, ...rest }: LazyTreeProps<T>) {
  const viewportRef = useRef<HTMLUListElement>(null)
  const rootId = rest.getId(root)

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    // A parent sits centred above its children, so once the first level is wider
    // than the container the root ends up off-screen at scrollLeft 0 — the view
    // opens showing a row of children with no visible parent. Centre as soon as
    // the content first overflows, then stop: past that point the scroll position
    // belongs to the reader.
    const observer = new ResizeObserver(() => {
      if (viewport.scrollWidth <= viewport.clientWidth) return
      viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2
      observer.disconnect()
    })
    observer.observe(viewport.firstElementChild ?? viewport)

    return () => observer.disconnect()
  }, [rootId])

  return (
    <ul className={styles.viewport} ref={viewportRef}>
      {/* Keyed by the root: a different root is a different tree, so every
          branch's expansion state and fetched pages must be discarded rather
          than shown under an unrelated parent. */}
      <LazyTreeNode
        key={rootId}
        node={root}
        depth={0}
        defaultExpanded
        {...rest}
      />
    </ul>
  )
}

type LazyTreeNodeProps<T> = Omit<LazyTreeProps<T>, "root"> & {
  node: T
  depth: number
  defaultExpanded?: boolean
}

function LazyTreeNode<T>({
  node,
  depth,
  defaultExpanded = false,
  getId,
  getHasChildren,
  loadChildren,
  renderNode,
  getLabel,
}: LazyTreeNodeProps<T>) {
  const nodeId = getId(node)
  const hasChildren = getHasChildren(node)
  const label = getLabel?.(node) ?? nodeId

  const autoLoads = defaultExpanded && hasChildren
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [children, setChildren] = useState<T[]>([])
  const [meta, setMeta] = useState<LazyTreePage<T>["meta"] | null>(null)
  // Initialised rather than set from the effect below: a root that fetches on
  // mount is already loading on its first render, and saying so up front avoids
  // a synchronous setState inside the effect.
  const [loading, setLoading] = useState(autoLoads)
  const [error, setError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const nodeRowRef = useRef<HTMLDivElement>(null)

  // A branch opened by click owns a controller no effect cleanup would reach;
  // without this, a late response resolves against an unmounted node.
  useEffect(() => () => abortRef.current?.abort(), [])

  /**
   * Load one page of this node's children, from an event handler.
   *
   * `page === 1` replaces, later pages append: the reader is extending the
   * visible sibling row, not paging through it.
   */
  const loadPage = useCallback(
    (page: number) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setLoading(true)
      setError(null)

      loadChildren(nodeId, page, controller.signal)
        .then((response) => {
          if (controller.signal.aborted) return
          setChildren((current) =>
            page === 1 ? response.children : [...current, ...response.children],
          )
          setMeta(response.meta)
          setLoading(false)
        })
        .catch((cause: unknown) => {
          if (controller.signal.aborted) return
          setError(
            cause instanceof Error ? cause.message : "Failed to load children.",
          )
          setLoading(false)
        })
    },
    [loadChildren, nodeId],
  )

  const handleToggle = () => {
    const next = !expanded
    setExpanded(next)

    if (next) {
      // Children appear centred under this node, which on a wide tree is far off
      // to one side of the scroll viewport. Without this, expanding a branch
      // grows the container while the visible area stays empty, and the view
      // reads as broken.
      nodeRowRef.current?.scrollIntoView({ block: "nearest", inline: "center" })
    }

    // Fetch only the first time a branch opens; reopening shows what is held.
    if (next && children.length === 0 && !loading) {
      loadPage(1)
    }
  }

  /**
   * The root loads its first level on mount.
   *
   * Written as a promise chain rather than a call to `loadPage`: state must not
   * be set synchronously from an effect body, and `loading` is already seeded
   * from `autoLoads` above so there is nothing to set before the request starts.
   */
  useEffect(() => {
    if (!autoLoads) return

    const controller = new AbortController()
    abortRef.current = controller

    loadChildren(nodeId, 1, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return
        setChildren(response.children)
        setMeta(response.meta)
        setLoading(false)
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setError(
          cause instanceof Error ? cause.message : "Failed to load children.",
        )
        setLoading(false)
      })

    return () => controller.abort()
  }, [autoLoads, loadChildren, nodeId])

  const loadedCount = children.length
  const hasMore = meta !== null && loadedCount < meta.total
  const showChildRow =
    expanded && (loading || loadedCount > 0 || error !== null)

  return (
    <li className={cn(depth > 0 && styles.branch)}>
      <div className={cn(styles.nodeRow, "pb-5")} ref={nodeRowRef}>
        {renderNode(node)}

        {hasChildren && (
          <Button
            variant="secondary"
            size="icon"
            className={cn(styles.expandButton, "size-6 rounded-full")}
            onClick={handleToggle}
            aria-expanded={expanded}
            aria-label={
              expanded
                ? `Collapse downlines of ${label}`
                : `Expand downlines of ${label}`
            }
          >
            {loading && loadedCount === 0 ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform",
                  expanded && "rotate-180",
                )}
                aria-hidden="true"
              />
            )}
          </Button>
        )}
      </div>

      {showChildRow && (
        <ul className={cn(styles.childRow, depth === 0 && styles.childRowRoot)}>
          {children.map((child) => (
            <LazyTreeNode
              key={getId(child)}
              node={child}
              depth={depth + 1}
              getId={getId}
              getHasChildren={getHasChildren}
              loadChildren={loadChildren}
              renderNode={renderNode}
              getLabel={getLabel}
            />
          ))}

          {error !== null && (
            <li className={styles.branch}>
              <div className="text-destructive w-44 text-center text-sm">
                {error}
                <Button
                  variant="link"
                  size="sm"
                  className="h-6 text-sm"
                  onClick={() => loadPage(meta ? meta.currentPage : 1)}
                >
                  Retry
                </Button>
              </div>
            </li>
          )}

          {hasMore && (
            <li className={styles.branch}>
              {/* Inside the sibling row on purpose: it inherits the connector
                  rail, so the row reads as continuing rather than ending. */}
              <Button
                variant="outline"
                size="sm"
                className="h-auto w-44 flex-col gap-0.5 py-2"
                disabled={loading}
                onClick={() => loadPage((meta?.currentPage ?? 1) + 1)}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Plus className="size-4" aria-hidden="true" />
                )}
                <span className="text-sm font-medium">View more</span>
                <span className="text-muted-foreground text-sm">
                  {loadedCount} of {meta?.total}
                </span>
              </Button>
            </li>
          )}
        </ul>
      )}
    </li>
  )
}
