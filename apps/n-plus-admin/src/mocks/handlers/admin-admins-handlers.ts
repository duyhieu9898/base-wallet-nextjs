import { http, HttpResponse } from "msw"

import { API_BASE_URL } from "@/config/api.config"

const baseUrl = API_BASE_URL

const mockAdminsList = [
  {
    id: "admin-001",
    email: "superadmin@nplus.local",
    name: "Super Admin",
    role: "superAdmin",
    isActive: true,
    lastLoginAt: "2026-08-05T10:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "admin-002",
    email: "ops@nplus.local",
    name: "Ops Manager",
    role: "admin",
    isActive: true,
    lastLoginAt: "2026-08-04T15:30:00.000Z",
    createdAt: "2026-02-15T08:00:00.000Z",
  },
]

function checkBearerAuth(request: Request): Response | null {
  const authHeader = request.headers.get("Authorization")
  if (
    authHeader === "Bearer invalid" ||
    authHeader === "Bearer expired" ||
    request.headers.get("x-mock-unauthorized") === "true"
  ) {
    return HttpResponse.json(
      { error: "unauthorized", timestamp: new Date().toISOString() },
      { status: 401 },
    )
  }
  return null
}

export const adminAdminsHandlers = [
  // List admins with offset pagination (newest first unless sorted)
  http.get(`${baseUrl}/api/admin/admins`, ({ request }) => {
    const authError = checkBearerAuth(request)
    if (authError) return authError

    const url = new URL(request.url)
    const page = Number(url.searchParams.get("page") ?? "1")
    const limit = Number(url.searchParams.get("limit") ?? "10")
    const sortBy = url.searchParams.get("sortBy") ?? "createdAt"
    const sortOrder = url.searchParams.get("sortOrder") ?? "desc" // default newest first

    const sorted = [...mockAdminsList].sort((a, b) => {
      let comp = 0
      if (sortBy === "name") comp = a.name.localeCompare(b.name)
      else if (sortBy === "email") comp = a.email.localeCompare(b.email)
      else
        comp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()

      return sortOrder === "asc" ? comp : -comp
    })

    const start = (page - 1) * limit
    const paginated = sorted.slice(start, start + limit)

    return HttpResponse.json({
      data: paginated,
      total: sorted.length,
      page,
      limit,
      timestamp: new Date().toISOString(),
    })
  }),

  // Create new Admin account (Mutation)
  http.post(`${baseUrl}/api/admin/admins`, async ({ request }) => {
    const authError = checkBearerAuth(request)
    if (authError) return authError

    const body = (await request.json().catch(() => ({}))) as {
      name?: string
      email?: string
      role?: "superAdmin" | "admin" | "operator"
    }

    if (!body.name || !body.email) {
      return HttpResponse.json(
        { error: "nameAndEmailRequired", timestamp: new Date().toISOString() },
        { status: 400 },
      )
    }

    const newAdmin = {
      id: `admin-${String(mockAdminsList.length + 1).padStart(3, "0")}`,
      email: body.email,
      name: body.name,
      role: body.role || "admin",
      isActive: true,
      lastLoginAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }

    mockAdminsList.unshift(newAdmin)

    return HttpResponse.json(
      { admin: newAdmin, timestamp: new Date().toISOString() },
      { status: 201 },
    )
  }),

  // List admins for infinite scroll (stream - keyset paging, oldest first)
  http.get(`${baseUrl}/api/admin/admins/stream`, ({ request }) => {
    const authError = checkBearerAuth(request)
    if (authError) return authError

    const url = new URL(request.url)
    const lastId = url.searchParams.get("lastId")
    const limit = Number(url.searchParams.get("limit") ?? "10")

    // Oldest first
    const oldestFirst = [...mockAdminsList].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )

    let startIndex = 0
    if (lastId) {
      const idx = oldestFirst.findIndex((item) => item.id === lastId)
      if (idx !== -1) {
        startIndex = idx + 1
      }
    }

    const slice = oldestFirst.slice(startIndex, startIndex + limit)
    const hasMore = startIndex + limit < oldestFirst.length
    const nextLastId = slice.length > 0 ? slice[slice.length - 1].id : lastId

    return HttpResponse.json({
      data: slice,
      hasMore,
      lastId: nextLastId,
      timestamp: new Date().toISOString(),
    })
  }),
]
