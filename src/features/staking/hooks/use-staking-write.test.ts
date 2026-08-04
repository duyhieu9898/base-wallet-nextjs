import { describe, expect, it } from "vitest"

import { isUsdcStakeAllowanceSufficient } from "./use-staking-write"

describe("USDC staking approval preflight", () => {
  it("keeps the primary stake unavailable while approval has no successful allowance evidence", () => {
    expect(isUsdcStakeAllowanceSufficient(null, 1_000_000n)).toBe(false)
    expect(isUsdcStakeAllowanceSufficient(999_999n, 1_000_000n)).toBe(false)
  })

  it("opens the primary stake only after the allowance read proves the approved amount", () => {
    // This is the state observed after a successful approval receipt invalidates
    // and refetches the allowance query.
    expect(isUsdcStakeAllowanceSufficient(1_000_000n, 1_000_000n)).toBe(true)
  })
})
