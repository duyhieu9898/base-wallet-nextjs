import { http, HttpResponse } from "msw"

const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8080"

export const adminBonusesHandlers = [
  // List bonus runs and payout history
  http.get(`${baseUrl}/api/admin/bonuses`, () => {
    return HttpResponse.json({
      summary: {
        totalAccruedUsdt: "185000.00",
        totalPaidUsdt: "142000.00",
        pendingPayoutUsdt: "43000.00",
        lastRunAt: "2026-08-01T00:00:00Z",
      },
      runs: [
        {
          id: "run-2026-07",
          period: "July 2026",
          accruedAmountUsdt: "45000.00",
          paidAmountUsdt: "45000.00",
          eligiblePositions: 184,
          status: "Confirmed",
          executedAt: "2026-08-01T02:00:00Z",
        },
        {
          id: "run-2026-06",
          period: "June 2026",
          accruedAmountUsdt: "42000.00",
          paidAmountUsdt: "42000.00",
          eligiblePositions: 165,
          status: "Confirmed",
          executedAt: "2026-07-01T02:00:00Z",
        },
        {
          id: "run-2026-08",
          period: "August 2026 (Current)",
          accruedAmountUsdt: "43000.00",
          paidAmountUsdt: "0.00",
          eligiblePositions: 192,
          status: "Pending",
          executedAt: null,
        },
      ],
    })
  }),
]
