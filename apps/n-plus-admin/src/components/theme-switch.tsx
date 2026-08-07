"use client"

import { useEffect } from "react"
import { Check, Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type ThemeSwitchTheme = "dark" | "light" | "system"

export type ThemeSwitchProps = {
  theme: ThemeSwitchTheme
  onThemeChange: (theme: ThemeSwitchTheme) => void
}

/**
 * Theme picker.
 *
 * Takes the current theme and a setter as props rather than reading a theme
 * context: the context is application-owned, and a shared UI package cannot
 * depend on one consumer's provider.
 */
export function ThemeSwitch({ theme, onThemeChange }: ThemeSwitchProps) {
  /* Update theme-color meta tag
   * when theme is updated */
  useEffect(() => {
    const themeColor = theme === "dark" ? "#020817" : "#fff"
    const metaThemeColor = document.querySelector("meta[name='theme-color']")
    if (metaThemeColor) metaThemeColor.setAttribute("content", themeColor)
  }, [theme])

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="scale-95 rounded-full">
          <Sun className="size-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute size-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onThemeChange("light")}>
          Light{" "}
          <Check
            size={14}
            className={cn("ms-auto", theme !== "light" && "hidden")}
          />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onThemeChange("dark")}>
          Dark
          <Check
            size={14}
            className={cn("ms-auto", theme !== "dark" && "hidden")}
          />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onThemeChange("system")}>
          System
          <Check
            size={14}
            className={cn("ms-auto", theme !== "system" && "hidden")}
          />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
