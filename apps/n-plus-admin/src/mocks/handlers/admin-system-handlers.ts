import { http, HttpResponse } from "msw"

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export const adminSystemHandlers = [
  // Admin System Maintenance Mode Status
  http.get(`${baseUrl}/api/admin/maintenance`, () => {
    return HttpResponse.json({
      maintenanceEnabled: false,
      scheduledWindow: null,
      message: "All services operating normally.",
    })
  }),
]
