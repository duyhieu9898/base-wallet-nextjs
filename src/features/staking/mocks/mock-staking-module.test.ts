import { describe, expect, it } from "vitest"

import {
  createMockStakingModule,
  MOCK_STAKING_ACCOUNT,
  MOCK_STAKING_ASSET,
  type StakingPosition,
} from "@/features/staking"

const OTHER_ACCOUNT = "0x3333333333333333333333333333333333333333" as const

describe("mock staking module", () => {
  it("returns only the requested account's fixture positions", async () => {
    const position: StakingPosition = {
      id: "position-1",
      account: MOCK_STAKING_ACCOUNT,
      assetAddress: MOCK_STAKING_ASSET,
      amount: 1_000_000n,
    }
    const stakingModule = createMockStakingModule({
      positions: [
        position,
        { ...position, id: "position-2", account: OTHER_ACCOUNT },
      ],
    })

    await expect(
      stakingModule.getSnapshot({
        account: MOCK_STAKING_ACCOUNT,
        chainId: 11155111,
      }),
    ).resolves.toEqual({
      account: MOCK_STAKING_ACCOUNT,
      chainId: 11155111,
      positions: [position],
    })
  })

  it("does not pretend to prepare a transaction when only a mock adapter exists", async () => {
    const stakingModule = createMockStakingModule()

    await expect(
      stakingModule.prepareAction({
        chainId: 11155111,
        action: {
          type: "stake",
          account: MOCK_STAKING_ACCOUNT,
          assetAddress: MOCK_STAKING_ASSET,
          amount: 1n,
        },
      }),
    ).resolves.toMatchObject({
      status: "unsupported",
      reason: "onchain-adapter-not-installed",
      deployment: { chainId: 11155111, status: "active" },
    })
  })
})
