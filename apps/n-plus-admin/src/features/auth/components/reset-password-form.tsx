import { ArrowRight, Loader2 } from "lucide-react"

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

interface ResetPasswordFormProps {
  email: string
  setEmail: (val: string) => void
  onSubmit: (e: React.FormEvent) => void
  onBack: () => void
  isPending: boolean
  errorMsg: string | null
}

export function ResetPasswordForm({
  email,
  setEmail,
  onSubmit,
  onBack,
  isPending,
  errorMsg,
}: ResetPasswordFormProps) {
  return (
    <Card className="max-w-sm gap-4 sm:min-w-sm">
      <CardHeader>
        <CardTitle className="text-lg tracking-tight">
          Forgot Password
        </CardTitle>
        <CardDescription>
          Enter your registered email and <br className="max-sm:hidden" /> we
          will send you a link to reset your password.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          {errorMsg && (
            <div className="text-destructive bg-destructive/10 border-destructive/20 rounded border p-2.5 text-xs font-medium">
              {errorMsg}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button className="mt-2 w-full gap-2" disabled={isPending}>
            Continue
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
          </Button>
        </CardContent>
      </form>
      <CardFooter>
        <p className="text-muted-foreground mx-auto px-8 text-center text-sm text-balance">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            className="hover:text-primary underline underline-offset-4"
            onClick={onBack}
          >
            Sign up
          </button>
          .
        </p>
      </CardFooter>
    </Card>
  )
}
