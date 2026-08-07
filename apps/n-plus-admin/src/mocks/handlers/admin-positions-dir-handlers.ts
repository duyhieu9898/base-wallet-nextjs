import { http, HttpResponse } from "msw"

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export const adminPositionsDirHandlers = [
  // List all positions directory
  http.get(`${baseUrl}/api/admin/positions`, () => {
    return HttpResponse.json({
      positions: [
        {
          id: "pos-001",
          positionIndex: 0,
          referralCode: "NPLUS-REF1",
          walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
          personalRank: "Gold",
          teamRank: "Diamond Leader",
          status: "Active",
          withdrawalCapUsdt: "50000.00",
          joinedAt: "2026-01-15T10:00:00Z",
        },
        {
          id: "pos-002",
          positionIndex: 1,
          referralCode: "NPLUS-REF2",
          walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
          personalRank: "Silver",
          teamRank: "Team Captain",
          status: "Active",
          withdrawalCapUsdt: "20000.00",
          joinedAt: "2026-02-01T14:30:00Z",
        },
        {
          id: "pos-003",
          positionIndex: 0,
          referralCode: "NPLUS-REF3",
          walletAddress: "0x90f79bf6eB2c4f8080653a214D57053e8A4a5840",
          personalRank: "Bronze",
          teamRank: "Member",
          status: "Active",
          withdrawalCapUsdt: "5000.00",
          joinedAt: "2026-03-10T09:15:00Z",
        },
      ],
      total: 3,
    })
  }),
]
