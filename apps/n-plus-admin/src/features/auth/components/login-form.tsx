"use client"

import { Loader2, LogIn } from "lucide-react"

import { PasswordInput } from "@/components/password-input"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface LoginFormProps {
  email: string
  setEmail: (val: string) => void
  password: string
  setPassword: (val: string) => void
  onSubmit: (e: React.FormEvent) => void
  onForgotPassword: () => void
  isPending: boolean
  errorMsg: string | null
  successMsg: string | null
}

export function LoginForm({
  email,
  setEmail,
  password,
  setPassword,
  onSubmit,
  onForgotPassword,
  isPending,
  errorMsg,
  successMsg,
}: LoginFormProps) {
  return (
    <Card className="max-w-sm gap-4">
      <CardHeader>
        <CardTitle className="text-lg tracking-tight">Sign in</CardTitle>
        <CardDescription>
          Enter your email and password below to log into your operator account.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          {errorMsg && (
            <div className="text-destructive bg-destructive/10 border-destructive/20 rounded border p-2.5 text-xs font-medium">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="rounded border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-xs font-medium text-emerald-600">
              {successMsg}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="relative space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                className="text-muted-foreground text-xs font-medium hover:underline hover:opacity-75"
                onClick={onForgotPassword}
              >
                Forgot password?
              </button>
            </div>
            <PasswordInput
              id="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            className="mt-2 w-full gap-2"
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            Sign in
          </Button>
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground px-6 text-center text-xs">
            By clicking sign in, you agree to our{" "}
            <a
              href="#"
              className="hover:text-primary underline underline-offset-4"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="#"
              className="hover:text-primary underline underline-offset-4"
            >
              Privacy Policy
            </a>
            .
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
