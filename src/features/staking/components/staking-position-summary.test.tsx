import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { StakingPositionSummary } from "./staking-position-summary"

describe("StakingPositionSummary", () => {
  it("renders the test-vault balances", () => {
    render(
      <StakingPositionSummary
        nativeAmount={1_500_000_000_000_000_000n}
        usdcAmount={2_500_000n}
        isPending={false}
        error={null}
      />,
    )

    expect(screen.getByText("1.5")).toBeInTheDocument()
    expect(screen.getByText("2.5")).toBeInTheDocument()
  })

  it("renders a read error instead of balances", () => {
    render(
      <StakingPositionSummary
        nativeAmount={null}
        usdcAmount={null}
        isPending={false}
        error={new Error("RPC unavailable")}
      />,
    )

    expect(screen.getByText(/RPC unavailable/)).toBeInTheDocument()
    expect(screen.queryByText("Staked ETH")).not.toBeInTheDocument()
  })
})
