import { http, HttpResponse } from "msw"

import { API_BASE_URL } from "@/config/api.config"

const baseUrl = API_BASE_URL

export const adminHealthHandlers = [
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
