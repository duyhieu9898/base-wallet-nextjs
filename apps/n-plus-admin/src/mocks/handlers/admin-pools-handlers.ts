import { http, HttpResponse } from "msw"

import { API_BASE_URL } from "@/config/api.config"

const baseUrl = API_BASE_URL

let mockLendingConfig = {
  asset: "USDT",
  collateralFactor: "0.80",
  liquidationThreshold: "0.85",
  liquidationBonus: "0.05",
  baseBorrowRate: "0.05",
  isPaused: false,
}

let mockStakingConfig = {
  nraRewardPerBlock: "10.00",
  usdtMatchRatio: "1.00",
  lockupDurationDays: 30,
  rewardMultiplierRankBonus: "1.25",
  isPaused: false,
}

export const adminPoolsHandlers = [
  // Admin Lending Pool Configuration GET
  http.get(`${baseUrl}/api/admin/pools/lending`, () => {
    return HttpResponse.json(mockLendingConfig)
  }),

  // Admin Lending Pool Configuration PUT (Mutation)
  http.put(`${baseUrl}/api/admin/pools/lending`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Partial<
      typeof mockLendingConfig
    >
    mockLendingConfig = { ...mockLendingConfig, ...body }
    return HttpResponse.json({
      message: "Lending pool configuration updated successfully.",
      config: mockLendingConfig,
      timestamp: new Date().toISOString(),
    })
  }),

  // Admin Staking Pool Configuration GET
  http.get(`${baseUrl}/api/admin/pools/staking`, () => {
    return HttpResponse.json(mockStakingConfig)
  }),

  // Admin Staking Pool Configuration PUT (Mutation)
  http.put(`${baseUrl}/api/admin/pools/staking`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Partial<
      typeof mockStakingConfig
    >
    mockStakingConfig = { ...mockStakingConfig, ...body }
    return HttpResponse.json({
      message: "Staking pool configuration updated successfully.",
      config: mockStakingConfig,
      timestamp: new Date().toISOString(),
    })
  }),
]
