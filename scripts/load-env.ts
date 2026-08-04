import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

/**
 * Load `.env.local` (nếu có) vào `process.env` cho các script chạy bằng tsx (không
 * qua Next.js). Shell env luôn thắng biến trong file. Dùng trước khi dynamic-import
 * các module app (vì chúng parse `clientEnv` lúc import).
 */
export function loadEnvLocal(): void {
  const path = resolve(process.cwd(), ".env.local")
  if (!existsSync(path)) {
    return
  }

  const content = readFileSync(path, "utf8")

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim()

    if (!line || line.startsWith("#")) {
      continue
    }

    const eq = line.indexOf("=")
    if (eq === -1) {
      continue
    }

    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}
