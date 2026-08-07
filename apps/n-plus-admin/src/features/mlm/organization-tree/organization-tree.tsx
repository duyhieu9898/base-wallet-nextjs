import { useCallback } from "react"

import { LazyTree } from "@/components/tree"

import { fetchOrganizationChildren } from "./organization-tree.api"
import { OrganizationNodeCard } from "./organization-node-card"
import type { OrganizationNode } from "./organization-tree.types"

/**
 * Unilevel organization map (`C050101`).
 *
 * This is the MLM-specific half: it knows that a node is a Position, that
 * children come from the admin positions endpoint, and that a node renders as a
 * card with a referral code, a wallet address, and a status.
 *
 * The tree mechanics — lazy expansion, sibling pagination, connector lines,
 * scroll behaviour — live in `@/components/tree`, which knows none of that. The
 * split is what keeps a second consumer (a member-facing downline view in the
 * product app) from having to reach into the admin API to reuse the view.
 */

type OrganizationTreeProps = {
  /** Root of the currently displayed tree. Re-rooting replaces this node. */
  root: OrganizationNode
  onSelectNode: (referralCode: string) => void
}

export function OrganizationTree({
  root,
  onSelectNode,
}: OrganizationTreeProps) {
  const renderNode = useCallback(
    (node: OrganizationNode) => (
      <OrganizationNodeCard node={node} onSelect={onSelectNode} />
    ),
    [onSelectNode],
  )

  return (
    <LazyTree
      root={root}
      getId={getPositionId}
      getHasChildren={getHasDownlines}
      getLabel={getReferralCode}
      loadChildren={fetchOrganizationChildren}
      renderNode={renderNode}
    />
  )
}

// Defined at module scope, not inline: the tree memoises nothing, but a new
// function identity on every render would still reach every node in the tree.
function getPositionId(node: OrganizationNode): string {
  return node.positionId
}

function getHasDownlines(node: OrganizationNode): boolean {
  return node.hasChildren
}

function getReferralCode(node: OrganizationNode): string {
  return node.referralCode
}
