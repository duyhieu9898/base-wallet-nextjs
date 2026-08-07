import {
  adminAuthResponseSchema,
  adminLoginResponseSchema,
} from "../domain/admin-auth.schemas"
import type {
  AdminAuthResponse,
  AdminLoginInput,
  AdminLoginResponse,
  TwoFactorVerifyInput,
} from "../domain/admin-auth.schemas"

const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8080"

export const adminAuthEndpoints = {
  login: "/api/admin/auth/login",
  verify2FA: "/api/admin/auth/2fa/verify",
  refresh: "/api/admin/auth/refresh",
  logout: "/api/admin/auth/logout",
  profile: "/api/admin/auth/profile",
} as const

async function adminApiPost<T>(
  path: string,
  body?: unknown,
  accessToken?: string,
): Promise<T> {
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
  })

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`)
  }

  const response = await fetch(new URL(path, baseUrl), {
    method: "POST",
    headers,
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 204) {
    return null as T
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))

    throw new Error(
      (errorBody as { message?: string }).message ||
        (errorBody as { error?: string }).error ||
        `HTTP Error ${response.status}`,
    )
  }

  return response.json() as Promise<T>
}

export async function adminLogin(
  input: AdminLoginInput,
): Promise<AdminLoginResponse> {
  const data = await adminApiPost<unknown>(adminAuthEndpoints.login, input)
  const parsed = adminLoginResponseSchema.safeParse(data)

  if (!parsed.success) {
    throw new Error("Invalid admin login response from server.")
  }

  return parsed.data
}

export async function adminVerify2FA(
  input: TwoFactorVerifyInput,
): Promise<AdminAuthResponse> {
  const data = await adminApiPost<unknown>(adminAuthEndpoints.verify2FA, input)
  const parsed = adminAuthResponseSchema.safeParse(data)

  if (!parsed.success) {
    throw new Error("Invalid 2FA verify response from server.")
  }

  return parsed.data
}

export async function adminRefreshSession(): Promise<AdminAuthResponse> {
  const data = await adminApiPost<unknown>(adminAuthEndpoints.refresh)
  const parsed = adminAuthResponseSchema.safeParse(data)

  if (!parsed.success) {
    throw new Error("Invalid admin refresh response from server.")
  }

  return parsed.data
}

export async function adminLogout(accessToken?: string): Promise<void> {
  await adminApiPost<null>(adminAuthEndpoints.logout, undefined, accessToken)
}

export async function getAdminProfile(
  accessToken: string,
): Promise<AdminAuthResponse> {
  const headers = new Headers({
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
  })

  const response = await fetch(new URL(adminAuthEndpoints.profile, baseUrl), {
    method: "GET",
    headers,
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status}`)
  }

  const data = await response.json()
  const parsed = adminAuthResponseSchema.safeParse(data)

  if (!parsed.success) {
    throw new Error("Invalid profile response from server.")
  }

  return parsed.data
}
