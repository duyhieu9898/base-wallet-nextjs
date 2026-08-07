import { http, HttpResponse } from "msw"

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export const healthHandlers = [
  http.get(`${baseUrl}/health`, () => {
    return HttpResponse.json({
      status: "ok",
      info: {
        database: { status: "up" },
        redis: { status: "up" },
      },
      error: {},
      details: {
        database: { status: "up" },
        redis: { status: "up" },
      },
      timestamp: new Date().toISOString(),
    })
  }),
]
