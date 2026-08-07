import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { WalletAddressCell } from "@/components/web3"

import type {
  OrganizationNode,
  PositionStatus,
} from "./organization-tree.types"

function statusVariant(
  status: PositionStatus,
): "default" | "secondary" | "destructive" {
  switch (status) {
    case "Active":
      return "default"
    case "Suspended":
      return "destructive"
    default:
      return "secondary"
  }
}

export type OrganizationNodeCardProps = {
  node: OrganizationNode
  /** Re-root the map at this Position (`C050101` §5). */
  onSelect: (referralCode: string) => void
}

/**
 * One Position in the map.
 *
 * `C050101` §4 specifies the node carries `referral_code` and `status`. The wallet
 * address is here too because the same screen searches by it, and reading it
 * requires the explorer link the admin tables already use.
 */
export function OrganizationNodeCard({
  node,
  onSelect,
}: OrganizationNodeCardProps) {
  return (
    <div className="bg-card w-44 rounded-md border p-2.5 text-center shadow-sm">
      <Button
        variant="ghost"
        size="sm"
        className="text-primary h-6 w-full px-1 font-mono text-sm font-bold"
        onClick={() => onSelect(node.referralCode)}
        title="Re-root the map at this position"
      >
        {node.referralCode}
      </Button>

      <div className="mt-1 flex justify-center">
        <WalletAddressCell address={node.walletAddress} className="text-sm" />
      </div>

      <Badge variant={statusVariant(node.status)} className="mt-1.5 text-sm">
        {node.status}
      </Badge>
    </div>
  )
}
