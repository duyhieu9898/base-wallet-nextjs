import { describe, expect, it } from "vitest"

import {
  findStakingDeployment,
  STAKING_DEPLOYMENTS,
} from "@/features/staking/public"

describe("staking deployment registry", () => {
  it("resolves the application-owned Sepolia test deployment", () => {
    expect(STAKING_DEPLOYMENTS).toHaveLength(1)
    expect(findStakingDeployment(11155111)).toMatchObject({
      chainId: 11155111,
      status: "active",
      contractAddress: "0xb786c18d2feb8ea7ee9d3a295203d7b1420abe43",
      version: "test-v1",
    })
  })

  it("returns an explicit unconfigured state for an undeployed chain", () => {
    expect(findStakingDeployment(1)).toEqual({
      chainId: 1,
      status: "unconfigured",
    })
  })
})
