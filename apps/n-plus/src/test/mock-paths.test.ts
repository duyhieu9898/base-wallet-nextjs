import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

// Vitest runs from repo root; `import.meta.url` is not a file URL in jsdom.
const repoRoot = process.cwd()
const srcRoot = join(repoRoot, "src")

/**
 * `vi.mock("...")` takes a string literal, not an import statement — so
 * ESLint `no-restricted-imports` does not see it and a `git mv` could
 * leave behind a mock pointing to a non-existent module.
 *
 * When the mocked module needs a provider to run (as all current mocks do),
 * a broken mock fails the test immediately. But that is only true due to module characteristics,
 * not design: a mock pointing to a runnable module needing no provider would silently
 * become a no-op, and tests continue to pass while mocking nothing.
 *
 * This test turns that conditional risk into a guaranteed failure, with a message
 * pointing to the exact file needing a fix.
 */
function collectTestFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)

    if (statSync(full).isDirectory()) {
      return collectTestFiles(full)
    }

    return /\.test\.tsx?$/.test(entry) ? [full] : []
  })
}

const MOCK_CALL = /vi\.mock\(\s*["'](@\/[^"']+)["']/g

function resolveAlias(specifier: string): string | null {
  const relative = specifier.replace(/^@\//, "")

  for (const extension of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const candidate = join(srcRoot, `${relative}${extension}`)

    if (existsSync(candidate) && !statSync(candidate).isDirectory()) {
      return candidate
    }
  }

  return null
}

describe("vi.mock paths", () => {
  const testFiles = collectTestFiles(srcRoot).filter(
    (file) => !file.endsWith("mock-paths.test.ts"),
  )

  it("finds test files to scan", () => {
    expect(testFiles.length).toBeGreaterThan(0)
  })

  it("every mocked @/ module resolves to a real file", () => {
    const broken: string[] = []

    for (const file of testFiles) {
      const source = readFileSync(file, "utf8")

      for (const match of source.matchAll(MOCK_CALL)) {
        const specifier = match[1]

        if (specifier && resolveAlias(specifier) === null) {
          broken.push(`${file.slice(repoRoot.length + 1)} → ${specifier}`)
        }
      }
    }

    expect(broken).toEqual([])
  })
})
