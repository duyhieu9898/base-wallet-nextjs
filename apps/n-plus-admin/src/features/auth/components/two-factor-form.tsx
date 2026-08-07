"use client"

import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"

interface TwoFactorFormProps {
  twoFactorCode: string
  setTwoFactorCode: (val: string) => void
  onSubmit: (e: React.FormEvent) => void
  onBack: () => void
  isPending: boolean
  errorMsg: string | null
}

export function TwoFactorForm({
  twoFactorCode,
  setTwoFactorCode,
  onSubmit,
  onBack,
  isPending,
  errorMsg,
}: TwoFactorFormProps) {
  return (
    <Card className="max-w-md gap-4 sm:min-w-md">
      <CardHeader>
        <CardTitle className="text-base tracking-tight">
          Two-factor Authentication
        </CardTitle>
        <CardDescription>
          Please enter the authentication code. <br className="max-sm:hidden" />{" "}
          We have sent the authentication code to your email.
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
            <Label className="sr-only">One-Time Password</Label>
            <InputOTP
              maxLength={6}
              value={twoFactorCode}
              onChange={(val) => setTwoFactorCode(val)}
              containerClassName="justify-between sm:[&>[data-slot='input-otp-group']>div]:w-12"
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button
            type="submit"
            className="mt-2 w-full gap-2"
            disabled={twoFactorCode.length < 6 || isPending}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Verify
          </Button>
        </CardContent>
      </form>
      <CardFooter>
        <p className="text-muted-foreground px-8 text-center text-sm">
          Haven&apos;t received it?{" "}
          <button
            type="button"
            className="hover:text-primary underline underline-offset-4"
            onClick={onBack}
          >
            Resend a new code..
          </button>
        </p>
      </CardFooter>
    </Card>
  )
}
