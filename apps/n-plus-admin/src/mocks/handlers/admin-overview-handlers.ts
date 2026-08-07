import { http, HttpResponse } from "msw"

const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8080"

export const adminOverviewHandlers = [
  // Admin Protocol & System Overview Stats
  http.get(`${baseUrl}/api/admin/overview`, () => {
    return HttpResponse.json({
      lending: {
        totalDepositedUsdt: "1250000.00",
        totalBorrowedUsdt: "750000.00",
        activeBorrowers: 142,
        utilizationRate: "60.00%",
      },
      staking: {
        totalStakedNra: "5000000.00",
        totalStakedUsdt: "250000.00",
        activeStakers: 389,
        currentApy: "18.50%",
      },
      members: {
        totalMembers: 520,
        activeMembersThisMonth: 312,
        totalTeamVolumeUsdt: "3400000.00",
      },
      recentActivities: [
        {
          id: "act-1",
          timestamp: "2026-08-06T10:15:00Z",
          actor: "0x7099...79C8",
          event: "StakePositionCreated",
          reference: "NPLUS-REF1",
        },
        {
          id: "act-2",
          timestamp: "2026-08-06T09:30:00Z",
          actor: "0x3C44...93BC",
          event: "LendingDeposit",
          reference: "NPLUS-REF2",
        },
        {
          id: "act-3",
          timestamp: "2026-08-05T16:00:00Z",
          actor: "operator1@n-plus.local",
          event: "BonusRunExecuted",
          reference: "run-2026-07",
        },
      ],
    })
  }),
]
