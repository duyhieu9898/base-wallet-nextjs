"use client"

import { formatEther, formatUnits } from "viem"

type StakingPositionSummaryProps = {
  nativeAmount: bigint | null
  usdcAmount: bigint | null
  isPending: boolean
  error: Error | null
}

/** Displays the two balances exposed by the test vault; it owns no wallet or write state. */
export function StakingPositionSummary({
  nativeAmount,
  usdcAmount,
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

  return (
    <dl className="grid grid-cols-2 gap-2 text-sm">
      <div>
        <dt className="text-muted-foreground">Staked ETH</dt>
        <dd className="font-medium">
          {nativeAmount === null ? "—" : formatEther(nativeAmount)}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Staked USDC</dt>
        <dd className="font-medium">
          {usdcAmount === null ? "—" : formatUnits(usdcAmount, 6)}
        </dd>
      </div>
    </dl>
  )
}
