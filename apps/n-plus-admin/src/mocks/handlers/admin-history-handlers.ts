import { http, HttpResponse } from "msw"

const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8080"

export const adminHistoryHandlers = [
  // List system transaction history
  http.get(`${baseUrl}/api/admin/history`, () => {
    return HttpResponse.json({
      transactions: [
        {
          id: "tx-001",
          txHash:
            "0x3a4b91f82c0192e4857b6d19203a11f203b405c6078d91a2b3c4d5e6f7a8b9c0",
          chain: "EVM (Sepolia)",
          sourceType: "StakeTransaction",
          positionReferralCode: "NPLUS-REF1",
          type: "Stake",
          amount: "5000.00 NRA",
          status: "Synced",
          occurredAt: "2026-08-05T14:20:00Z",
        },
        {
          id: "tx-002",
          txHash:
            "0x1f2e3d4c5b6a7081928374655463728190a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5",
          chain: "EVM (Sepolia)",
          sourceType: "LendingTransaction",
          positionReferralCode: "NPLUS-REF2",
          type: "Deposit",
          amount: "1000.00 USDT",
          status: "Synced",
          occurredAt: "2026-08-04T11:15:00Z",
        },
        {
          id: "tx-003",
          txHash:
            "0x9876543210abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          chain: "EVM (Sepolia)",
          sourceType: "BonusClaimTransaction",
          positionReferralCode: "NPLUS-REF1",
          type: "Claim",
          amount: "250.00 USDT",
          status: "Pending",
          occurredAt: "2026-08-06T08:00:00Z",
        },
      ],
      total: 3,
    })
  }),
]
