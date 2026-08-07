import { formatUnits } from "viem"

type StakedAsset = Readonly<{
  amount: bigint | null
  symbol: string
  decimals: number
}>

type StakingPositionSummaryProps = {
  native: StakedAsset | null
  token: StakedAsset | null
  isPending: boolean
  error: Error | null
}

/** Displays the two balances exposed by the test vault; it owns no wallet or write state. */
export function StakingPositionSummary({
  native,
  token,
  isPending,
  error,
}: StakingPositionSummaryProps) {
  if (isPending) {
    return (
      <p className="text-muted-foreground text-sm">
        Reading on-chain position…
      </p>
    )
  }

  if (error) {
    return (
      <p className="text-destructive text-sm">
        Could not read staking position: {error.message}
      </p>
    )
  }

  // Decimals come from the caller's registry lookup. Formatting either balance
  // with a literal would misreport any asset that does not happen to match it.
  return (
    <dl className="grid grid-cols-2 gap-2 text-sm">
      {[native, token].map((asset, index) =>
        asset === null ? null : (
          <div key={asset.symbol || index}>
            <dt className="text-muted-foreground">Staked {asset.symbol}</dt>
            <dd className="font-medium">
              {asset.amount === null
                ? "—"
                : formatUnits(asset.amount, asset.decimals)}
            </dd>
          </div>
        ),
      )}
    </dl>
  )
}
