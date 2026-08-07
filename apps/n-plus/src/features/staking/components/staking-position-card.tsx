import { Button } from "@/components/ui/button"
import { useStakingPosition } from "../hooks/use-staking-position"
import { StakingActionPanel } from "./staking-action-panel"
import { StakingPositionSummary } from "./staking-position-summary"

/** Composes the test-vault read model with its feature-local action flow. */
export function StakingPositionCard() {
  const position = useStakingPosition()
  const deployment =
    position.deployment?.status === "active" ? position.deployment : null

  if (position.selection.status !== "ready") return null

  if (!deployment) {
    return (
      <section className="border-border rounded-lg border p-4">
        <h2 className="font-semibold">Test staking vault</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          No test-vault deployment is configured for this network.
        </p>
      </section>
    )
  }

  const refetchPosition = () => void position.refetch()

  return (
    <section className="border-border space-y-3 rounded-lg border p-4">
      <div>
        <h2 className="font-semibold">Test staking vault</h2>
        <p className="text-muted-foreground text-sm">
          Test fixture: no reward or lock period.
        </p>
      </div>

      <StakingPositionSummary
        native={
          position.nativeCurrency
            ? {
                amount: position.nativeAmount,
                symbol: position.nativeCurrency.symbol,
                decimals: position.nativeCurrency.decimals,
              }
            : null
        }
        token={
          position.token
            ? {
                amount: position.tokenAmount,
                symbol: position.token.symbol,
                decimals: position.token.expectedDecimals,
              }
            : null
        }
        isPending={position.isPending}
        error={position.error}
      />
      <Button variant="outline" size="sm" onClick={refetchPosition}>
        Refresh position
      </Button>
      <StakingActionPanel
        deployment={deployment}
        chainId={position.selection.chainId}
        onReceiptSuccess={refetchPosition}
      />
    </section>
  )
}
