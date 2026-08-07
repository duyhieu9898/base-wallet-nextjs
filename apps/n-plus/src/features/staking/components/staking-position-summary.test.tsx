import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { StakingPositionSummary } from "./staking-position-summary"

const native = { symbol: "ETH", decimals: 18 }
const token = { symbol: "USDC", decimals: 6 }

describe("StakingPositionSummary", () => {
  it("renders the test-vault balances", () => {
    render(
      <StakingPositionSummary
        native={{ ...native, amount: 1_500_000_000_000_000_000n }}
        token={{ ...token, amount: 2_500_000n }}
        isPending={false}
        error={null}
      />,
    )

    expect(screen.getByText("1.5")).toBeInTheDocument()
    expect(screen.getByText("2.5")).toBeInTheDocument()
  })

  it("formats each balance with the decimals it was given, not a fixed one", () => {
    // The vault's ERC-20 is whatever its deployment points at. A hardcoded `6`
    // would misreport an 18-decimal token by twelve orders of magnitude.
    render(
      <StakingPositionSummary
        native={{
          symbol: "POL",
          decimals: 18,
          amount: 3_000_000_000_000_000_000n,
        }}
        token={{
          symbol: "DAI",
          decimals: 18,
          amount: 2_000_000_000_000_000_000n,
        }}
        isPending={false}
        error={null}
      />,
    )

    expect(screen.getByText("Staked POL")).toBeInTheDocument()
    expect(screen.getByText("Staked DAI")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
  })

  it("renders a read error instead of balances", () => {
    render(
      <StakingPositionSummary
        native={{ ...native, amount: null }}
        token={{ ...token, amount: null }}
        isPending={false}
        error={new Error("RPC unavailable")}
      />,
    )

    expect(screen.getByText(/RPC unavailable/)).toBeInTheDocument()
    expect(screen.queryByText("Staked ETH")).not.toBeInTheDocument()
  })
})
