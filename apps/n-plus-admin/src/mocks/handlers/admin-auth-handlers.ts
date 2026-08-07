import { http, HttpResponse } from "msw"

import { API_BASE_URL } from "@/config/api.config"

const baseUrl = API_BASE_URL

export const adminAuthEndpoints = {
  login: "/api/admin/auth/login",
  verify2FA: "/api/admin/auth/2fa/verify",
  refresh: "/api/admin/auth/refresh",
  logout: "/api/admin/auth/logout",
  profile: "/api/admin/auth/profile",
  forgotPassword: "/api/admin/auth/forgot-password",
  resetPassword: "/api/admin/auth/reset-password",
  setup2FA: "/api/admin/auth/2fa/setup",
  enable2FA: "/api/admin/auth/2fa/enable",
  disable2FA: "/api/admin/auth/2fa/disable",
} as const

export const mockAdminUser = {
  id: "admin-001",
  email: "admin@nplus.local",
  name: "Super Admin",
  role: "superAdmin" as const,
  twoFactorEnabled: false,
}

// In-memory auth state for n-plus-admin mock
let twoFactorEnabled = false
const twoFactorChallenges = new Map<
  string,
  { email: string; createdAt: number }
>()
const adminRefreshSessions = new Map<
  string,
  { id: string; familyId: string; revoked: boolean }
>()
let currentAdminRefreshCookieId: string | null = null
let sessionCounter = 0

function refreshCookieHeaders(sessionId: string | null): HeadersInit {
  return {
    "Set-Cookie":
      sessionId === null
        ? "admin_refresh_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
        : `admin_refresh_token=${sessionId}; Path=/; HttpOnly; SameSite=Lax`,
  }
}

function createAdminSession(): {
  id: string
  familyId: string
  revoked: boolean
} {
  sessionCounter += 1
  const session = {
    id: `admin_refresh_${sessionCounter}`,
    familyId: `admin_family_${sessionCounter}`,
    revoked: false,
  }
  adminRefreshSessions.set(session.id, session)
  currentAdminRefreshCookieId = session.id
  return session
}

function errorEnvelope(code: string, status = 401) {
  return HttpResponse.json(
    { error: code, timestamp: new Date().toISOString() },
    { status },
  )
}

function checkBearerAuth(request: Request): Response | null {
  const authHeader = request.headers.get("Authorization")
  if (
    authHeader === "Bearer invalid" ||
    authHeader === "Bearer expired" ||
    request.headers.get("x-mock-unauthorized") === "true"
  ) {
    return errorEnvelope("unauthorized", 401)
  }
  return null
}

export const adminAuthHandlers = [
  // Admin Login (Email + Password)
  http.post(`${baseUrl}${adminAuthEndpoints.login}`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string
      password?: string
      rememberMe?: boolean
    }

    if (!body.email || !body.password) {
      return errorEnvelope("invalidCredentials", 401)
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return errorEnvelope("invalidCredentials", 401)
    }

    // Explicit test triggers for invalid credentials
    if (
      body.password === "wrongpassword" ||
      body.password === "wrongpass" ||
      body.email === "wrong@nplus.local" ||
      request.headers.get("x-mock-invalid-credentials") === "true"
    ) {
      return errorEnvelope("invalidCredentials", 401)
    }

    const requires2FA =
      twoFactorEnabled ||
      body.email === "2fa@nplus.local" ||
      request.headers.get("x-mock-2fa-required") === "true"

    if (requires2FA) {
      const twoFactorToken = `challenge-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      twoFactorChallenges.set(twoFactorToken, {
        email: body.email,
        createdAt: Date.now(),
      })

      return HttpResponse.json({
        twoFactorRequired: true,
        twoFactorToken,
      })
    }

    const session = createAdminSession()

    return HttpResponse.json(
      {
        accessToken: "mock-admin-access-token-12345",
        expiresIn: 900,
        admin: { ...mockAdminUser, email: body.email },
      },
      {
        headers: refreshCookieHeaders(session.id),
      },
    )
  }),

  // Admin 2FA Verify Challenge
  http.post(
    `${baseUrl}${adminAuthEndpoints.verify2FA}`,
    async ({ request }) => {
      const body = (await request.json().catch(() => ({}))) as {
        code?: string
        twoFactorToken?: string
      }

      if (!body.code || !body.twoFactorToken) {
        return errorEnvelope("invalidTwoFactorCode", 401)
      }

      const challenge = twoFactorChallenges.get(body.twoFactorToken)
      if (!challenge && body.twoFactorToken !== "mock-2fa-token") {
        return errorEnvelope("challengeUnknownOrExpired", 401)
      }

      if (body.code !== "287082") {
        return errorEnvelope("invalidTwoFactorCode", 401)
      }

      if (challenge) {
        twoFactorChallenges.delete(body.twoFactorToken)
      }

      const session = createAdminSession()

      return HttpResponse.json(
        {
          accessToken: "mock-admin-access-token-12345",
          expiresIn: 900,
          admin: {
            ...mockAdminUser,
            email: challenge?.email ?? mockAdminUser.email,
            twoFactorEnabled: true,
          },
        },
        {
          headers: refreshCookieHeaders(session.id),
        },
      )
    },
  ),

  // Admin Refresh
  http.post(`${baseUrl}${adminAuthEndpoints.refresh}`, () => {
    if (!currentAdminRefreshCookieId) {
      return errorEnvelope("invalidRefreshCookie", 401)
    }

    const session = adminRefreshSessions.get(currentAdminRefreshCookieId)
    if (!session || session.revoked) {
      return errorEnvelope("sessionExpiredOrRevoked", 401)
    }

    session.revoked = true
    const rotated = createAdminSession()

    return HttpResponse.json(
      {
        accessToken: "mock-admin-access-token-refreshed",
        expiresIn: 900,
        admin: { ...mockAdminUser, twoFactorEnabled },
      },
      {
        headers: refreshCookieHeaders(rotated.id),
      },
    )
  }),

  // Admin Logout
  http.post(`${baseUrl}${adminAuthEndpoints.logout}`, () => {
    currentAdminRefreshCookieId = null
    return new HttpResponse(null, {
      status: 204,
      headers: refreshCookieHeaders(null),
    })
  }),

  // Admin Profile
  http.get(`${baseUrl}${adminAuthEndpoints.profile}`, ({ request }) => {
    const authError = checkBearerAuth(request)
    if (authError) return authError

    return HttpResponse.json({
      accessToken: "mock-admin-access-token-12345",
      expiresIn: 900,
      admin: { ...mockAdminUser, twoFactorEnabled },
    })
  }),

  // Forgot Password
  http.post(
    `${baseUrl}${adminAuthEndpoints.forgotPassword}`,
    async ({ request }) => {
      const body = (await request.json().catch(() => ({}))) as {
        email?: string
      }
      if (!body.email) {
        return errorEnvelope("emailRequired", 400)
      }
      return new HttpResponse(null, { status: 204 })
    },
  ),

  // Reset Password
  http.post(
    `${baseUrl}${adminAuthEndpoints.resetPassword}`,
    async ({ request }) => {
      const body = (await request.json().catch(() => ({}))) as {
        token?: string
        password?: string
      }

      if (!body.token || !body.password) {
        return errorEnvelope("invalidResetToken", 401)
      }

      if (body.token === "EXPIRED" || body.token === "SPENT") {
        return errorEnvelope("linkUnknownExpiredOrSpent", 401)
      }

      currentAdminRefreshCookieId = null
      return new HttpResponse(null, { status: 204 })
    },
  ),

  // 2FA Setup
  http.post(`${baseUrl}${adminAuthEndpoints.setup2FA}`, ({ request }) => {
    const authError = checkBearerAuth(request)
    if (authError) return authError

    if (twoFactorEnabled) {
      return errorEnvelope("twoFactorAlreadyEnabled", 409)
    }

    return HttpResponse.json({
      secret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
      otpauthUri:
        "otpauth://totp/N%2B%20MLM%20Admin%3Aadmin%40nplus.local?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=N%2B+MLM+Admin&algorithm=SHA1&digits=6&period=30",
    })
  }),

  // 2FA Enable
  http.post(
    `${baseUrl}${adminAuthEndpoints.enable2FA}`,
    async ({ request }) => {
      const authError = checkBearerAuth(request)
      if (authError) return authError

      if (twoFactorEnabled) {
        return errorEnvelope("twoFactorAlreadyEnabled", 409)
      }

      const body = (await request.json().catch(() => ({}))) as { code?: string }

      if (!body.code || body.code !== "287082") {
        return errorEnvelope("invalidTwoFactorCode", 401)
      }

      twoFactorEnabled = true
      currentAdminRefreshCookieId = null
      return new HttpResponse(null, { status: 204 })
    },
  ),

  // 2FA Disable
  http.post(
    `${baseUrl}${adminAuthEndpoints.disable2FA}`,
    async ({ request }) => {
      const authError = checkBearerAuth(request)
      if (authError) return authError

      if (!twoFactorEnabled) {
        return errorEnvelope("twoFactorNotEnabled", 409)
      }

      const body = (await request.json().catch(() => ({}))) as {
        code?: string
        password?: string
      }

      if (!body.code || !body.password || body.code !== "287082") {
        return errorEnvelope("invalidCredentials", 401)
      }

      twoFactorEnabled = false
      currentAdminRefreshCookieId = null
      return new HttpResponse(null, { status: 204 })
    },
  ),
]
