import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PasswordInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
>

export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  PasswordInputProps
>(({ className, disabled, ...props }, ref) => {
  const [showPassword, setShowPassword] = React.useState(false)

  return (
    <div className={cn("relative rounded-md", className)}>
      <input
        type={showPassword ? "text" : "password"}
        className="border-input placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 pr-10 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-1 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
        ref={ref}
        disabled={disabled}
        {...props}
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled={disabled}
        className="text-muted-foreground absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 rounded-md hover:bg-transparent"
        onClick={() => setShowPassword((prev) => !prev)}
      >
        {showPassword ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeOff className="h-4 w-4" />
        )}
        <span className="sr-only">
          {showPassword ? "Hide password" : "Show password"}
        </span>
      </Button>
    </div>
  )
})

PasswordInput.displayName = "PasswordInput"
