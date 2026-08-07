"use client"

import { Toaster as Sonner, ToasterProps } from "sonner"

/**
 * Styled Sonner toaster.
 *
 * Takes `theme` as a prop rather than reading a theme context: the context is
 * application-owned, and a shared UI package cannot depend on one consumer's
 * provider. The application wires it in `@/providers/themed-toaster`.
 */
export function Toaster({ theme = "system", ...props }: ToasterProps) {
  return (
    <Sonner
      theme={theme}
      className="toaster group [&_div[data-content]]:w-full"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}
