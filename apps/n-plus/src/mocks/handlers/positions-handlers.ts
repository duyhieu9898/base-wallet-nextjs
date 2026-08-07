import { http, HttpResponse } from "msw"

const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8080"

export const positionsHandlers = [
  // List caller-owned seats / positions
  http.get(`${baseUrl}/api/positions`, ({ request }) => {
    const authHeader = request.headers.get("Authorization")
    if (
      authHeader === "Bearer invalid" ||
      authHeader === "Bearer expired" ||
      request.headers.get("x-mock-unauthorized") === "true"
    ) {
      return HttpResponse.json(
        {
          error: "UNAUTHORIZED",
          message: "Missing or invalid access token",
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      )
    }

    return HttpResponse.json({
      data: [
        {
          id: "pos-001",
          positionIndex: 0,
          referralCode: "NPLUS-REF1",
          createdAt: "2026-01-15T10:00:00Z",
        },
        {
          id: "pos-002",
          positionIndex: 1,
          referralCode: "NPLUS-REF2",
          createdAt: "2026-02-01T14:30:00Z",
        },
      ],
      timestamp: new Date().toISOString(),
    })
  }),
]
