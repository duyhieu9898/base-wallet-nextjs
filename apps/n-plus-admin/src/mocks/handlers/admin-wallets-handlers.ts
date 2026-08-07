import { http, HttpResponse } from "msw"

import { API_BASE_URL } from "@/config/api.config"

const baseUrl = API_BASE_URL

const mockWalletsList = [
  {
    id: "wal-001",
    walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    chain: "EVM",
    status: "Active",
    positionsCount: 2,
    connectedAt: "2026-01-15T10:00:00Z",
    lastLoginAt: "2026-08-05T09:30:00Z",
  },
  {
    id: "wal-002",
    walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    chain: "EVM",
    status: "Active",
    positionsCount: 1,
    connectedAt: "2026-02-01T14:30:00Z",
    lastLoginAt: "2026-08-04T16:20:00Z",
  },
  {
    id: "wal-003",
    walletAddress: "0x90f79bf6eB2c4f8080653a214D57053e8A4a5840",
    chain: "EVM",
    status: "Locked",
    positionsCount: 1,
    connectedAt: "2026-03-10T09:15:00Z",
    lastLoginAt: "2026-07-20T11:00:00Z",
  },
]

export const adminWalletsHandlers = [
  // List registered wallets
  http.get(`${baseUrl}/api/admin/wallets`, () => {
    return HttpResponse.json({
      wallets: mockWalletsList,
      total: mockWalletsList.length,
    })
  }),

  // Toggle or update wallet status (Mutation)
  http.patch(
    `${baseUrl}/api/admin/wallets/:id`,
    async ({ params, request }) => {
      const { id } = params
      const body = (await request.json().catch(() => ({}))) as {
        status?: string
      }
      const walletIndex = mockWalletsList.findIndex((w) => w.id === id)

      if (walletIndex === -1) {
        return HttpResponse.json(
          { error: "walletNotFound", timestamp: new Date().toISOString() },
          { status: 404 },
        )
      }

      const updated = {
        ...mockWalletsList[walletIndex],
        status:
          body.status ||
          (mockWalletsList[walletIndex].status === "Active"
            ? "Locked"
            : "Active"),
      }
      mockWalletsList[walletIndex] = updated

      return HttpResponse.json({
        wallet: updated,
        timestamp: new Date().toISOString(),
      })
    },
  ),
]
