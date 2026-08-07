"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { AuthLayout } from "@/features/auth/auth-layout"
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form"
import { TwoFactorForm } from "@/features/auth/components/two-factor-form"
import { UserAuthForm } from "@/features/auth/components/user-auth-form"
import { useAdminAuth } from "@/features/auth/runtime/admin-auth-context"

type AuthStep = "login" | "2fa" | "reset"

export default function AdminLoginPage() {
  const router = useRouter()
  const {
    state: authState,
    login,
    verify2FA,
    isPending,
    error: authError,
  } = useAdminAuth()

  const [step, setStep] = useState<AuthStep>("login")
  const [email, setEmail] = useState("admin@nplus.local")
  const [password, setPassword] = useState("password123")
  const [resetEmail, setResetEmail] = useState("")
  const [twoFactorCode, setTwoFactorCode] = useState("")
  const [isResetPending, setIsResetPending] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const activeStep: AuthStep =
    step === "reset"
      ? "reset"
      : authState.status === "2fa_required"
        ? "2fa"
        : step === "2fa"
          ? "2fa"
          : "login"

  // Redirect on successful authentication
  useEffect(() => {
    if (authState.status === "authenticated") {
      router.push("/")
    }
  }, [authState.status, router])

  const errorMsg = localError || authError

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    try {
      await login({ email, password })
    } catch (err: unknown) {
      if (err instanceof Error) {
        setLocalError(err.message)
      } else {
        setLocalError("Login failed. Please check credentials.")
      }
    }
  }

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    try {
      await verify2FA(twoFactorCode)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setLocalError(err.message)
      } else {
        setLocalError("Invalid 2FA code.")
      }
    }
  }

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    setIsResetPending(true)

    const targetEmail = resetEmail || "admin@nplus.local"

    toast.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
      loading: "Sending email...",
      success: () => {
        setIsResetPending(false)
        setStep("2fa")
        return `Email sent to ${targetEmail}`
      },
      error: "Error sending email",
    })
  }

  return (
    <AuthLayout>
      {activeStep === "login" && (
        <UserAuthForm
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          onSubmit={handleLoginSubmit}
          onForgotPassword={() => {
            setLocalError(null)
            setResetEmail("")
            setStep("reset")
          }}
          isPending={isPending}
          errorMsg={errorMsg}
        />
      )}

      {activeStep === "2fa" && (
        <TwoFactorForm
          twoFactorCode={twoFactorCode}
          setTwoFactorCode={setTwoFactorCode}
          onSubmit={handle2FASubmit}
          onBack={() => {
            setLocalError(null)
            setStep("login")
          }}
          isPending={isPending}
          errorMsg={errorMsg}
        />
      )}

      {activeStep === "reset" && (
        <ResetPasswordForm
          email={resetEmail}
          setEmail={setResetEmail}
          onSubmit={handleResetSubmit}
          onBack={() => {
            setLocalError(null)
            setStep("login")
          }}
          isPending={isResetPending}
          errorMsg={errorMsg}
        />
      )}
    </AuthLayout>
  )
}
