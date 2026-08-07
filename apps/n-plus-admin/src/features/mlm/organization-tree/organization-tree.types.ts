/**
 * Unilevel organization tree — transport and view types.
 *
 * The tree is explored, not loaded: `C050101` §5 states that a tree too large to
 * render fully loads only the levels near the root and expands on demand. So the
 * API returns **one level at a time**, and siblings within a level are paginated —
 * a single Position may sponsor hundreds of downlines.
 *
 * Both shapes are therefore per-node and per-page, never a whole subtree.
 */

/** Position status as reported by the admin API (`Position.status`). */
export type PositionStatus = "Active" | "Inactive" | "Suspended"

/**
 * One Position in the tree.
 *
 * `hasChildren` is authoritative and comes from the backend: it decides whether a
 * node renders an expand control at all, and it must be known *before* the node's
 * children have ever been fetched.
 */
export type OrganizationNode = {
  positionId: string
  referralCode: string
  status: PositionStatus
  walletAddress: string
  hasChildren: boolean
}

/**
 * Sibling pagination for one parent's children.
 *
 * `total` is the count of *all* children of that parent, not the page size, so the
 * view can tell "showing 10 of 137" and decide whether a load-more control belongs
 * in the row.
 */
export type OrganizationPageMeta = {
  currentPage: number
  perPage: number
  total: number
}

export type OrganizationDescendantsResponse = {
  children: OrganizationNode[]
  meta: OrganizationPageMeta
}

export type OrganizationRootResponse = OrganizationNode & {
  joinedAt: string
  isRoot: boolean
  descendantCount: number
  maxDepth: number
}
