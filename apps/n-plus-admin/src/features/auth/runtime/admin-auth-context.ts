"use client"

import { createContext, useContext } from "react"
import type {
  AdminProfile,
  AdminLoginInput,
} from "../domain/admin-auth.schemas"

export type AdminAuthState =
  | { status: "bootstrapping" }
  | { status: "unauthenticated" }
  | { status: "2fa_required"; twoFactorToken: string }
  | { status: "authenticated"; admin: AdminProfile; expiresIn: number }

export type AdminAuthContextValue = {
  state: AdminAuthState
  login(input: AdminLoginInput): Promise<void>
  verify2FA(code: string): Promise<void>
  logout(): Promise<void>
  isPending: boolean
  error: string | null
}

export const AdminAuthContext = createContext<AdminAuthContextValue | null>(
  null,
)

export function useAdminAuth(): AdminAuthContextValue {
  const value = useContext(AdminAuthContext)

  if (!value) {
    throw new Error("useAdminAuth must be used within <AdminAuthProvider>")
  }

  return value
}
