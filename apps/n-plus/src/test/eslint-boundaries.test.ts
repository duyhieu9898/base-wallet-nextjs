/**
 * Fixtures that deliberately violate the architecture boundaries.
 *
 * A green `pnpm lint` on current source proves only that nobody has broken a
 * rule yet — not that the rule works. These fixtures lint code that must fail,
 * so a rule that silently stops matching (a renamed path, a pattern that never
 * covered relative traversal) is caught here instead of in review.
 *
 * They are linted through the ESLint API rather than written to disk, so they
 * cannot make `pnpm lint` itself red.
 */

import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { ESLint } from "eslint"
import { describe, expect, it } from "vitest"

/**
 * The rules under test live in the workspace-root eslint.config.mjs, and its
 * `files:` patterns are written relative to that root. Vitest runs with the app
 * as cwd, so the root is passed explicitly and every fixture path below is
 * root-relative — a cwd-relative path would be matched against the wrong
 * patterns and quietly report no violations.
 */
const WORKSPACE_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../..",
)

const eslint = new ESLint({ cwd: WORKSPACE_ROOT })

type Violation = { ruleId: string | null; severity: number }

async function lintAs(
  filePath: string,
  source: string,
): Promise<readonly Violation[]> {
  const [result] = await eslint.lintText(source, { filePath })
  return (result?.messages ?? []).map((message) => ({
    ruleId: message.ruleId,
    severity: message.severity,
  }))
}

function importRestrictions(violations: readonly Violation[]) {
  return violations.filter(
    (violation) =>
      violation.ruleId === "no-restricted-imports" ||
      violation.ruleId === "@typescript-eslint/no-restricted-imports",
  )
}

const FOUNDATION_FILE = "packages/web3-evm/src/chain/boundary-fixture.ts"
const STAKING_FILE =
  "apps/n-plus/src/features/staking/hooks/boundary-fixture.ts"
const APP_FILE = "apps/n-plus/src/lib/boundary-fixture.ts"

describe("architecture boundaries are enforced by ESLint, not by convention", () => {
  describe("foundation must not reach into application surfaces", () => {
    it("allows third-party and intra-foundation imports", async () => {
      const violations = await lintAs(
        FOUNDATION_FILE,
        `import { getAddress } from "viem"\nexport const x = getAddress\n`,
      )
      expect(importRestrictions(violations)).toEqual([])
    })

    it.each([
      [
        "design system by alias",
        `import { Button } from "@/components/ui/button"`,
      ],
      [
        "i18n by alias",
        `import { useTranslation } from "@/i18n/use-translation"`,
      ],
      [
        "application config by alias",
        `import { web3Config } from "@/config/web3.config"`,
      ],
      [
        "design system by relative traversal",
        `import { Button } from "../../../components/ui/button"`,
      ],
    ])("rejects %s as an error", async (_label, statement) => {
      const violations = importRestrictions(
        await lintAs(FOUNDATION_FILE, `${statement}\nexport const x = 1\n`),
      )
      expect(violations).toHaveLength(1)
      expect(violations[0]?.severity).toBe(2)
    })
  })

  describe("applications must not import each other", () => {
    // These two rules could not exist before apps/ did (§4.5). n-plus-admin now
    // exists, so `product ↛ admin` is enforced against a real pair rather than a
    // hypothetical one — and these fixtures stay, because they assert the rule
    // fires rather than that nobody has broken it yet.
    it.each([
      [
        "a sibling app by relative traversal",
        `import { x } from "../../n-plus-admin/src/features/members"`,
      ],
      [
        "its own admin, two levels up",
        `import { x } from "../../../n-plus-admin/src/lib/rbac"`,
      ],
      [
        "another product app as a workspace package",
        `import { x } from "@nln/neura-link"`,
      ],
    ])("rejects %s as an error", async (_label, statement) => {
      const violations = importRestrictions(
        await lintAs(APP_FILE, `${statement}\nexport const x = 1\n`),
      )
      expect(violations).toHaveLength(1)
      expect(violations[0]?.severity).toBe(2)
    })

    it("allows the shared foundation package", async () => {
      const violations = await lintAs(
        APP_FILE,
        `import { useEvmWallet } from "@nln/web3-evm"\nexport const x = useEvmWallet\n`,
      )
      expect(importRestrictions(violations)).toEqual([])
    })
  })

  describe("feature modules must not import each other", () => {
    it("allows the foundation public path", async () => {
      const violations = await lintAs(
        STAKING_FILE,
        `import { useEvmSelection } from "@nln/web3-evm"\nexport const x = useEvmSelection\n`,
      )
      expect(importRestrictions(violations)).toEqual([])
    })

    it.each([
      [
        "another feature by alias",
        `import { useAuth } from "@/features/auth/hooks/use-auth"`,
      ],
      [
        "another feature by relative traversal",
        `import { useAuth } from "../../auth/hooks/use-auth"`,
      ],
      [
        "foundation internals behind the public barrel",
        `import { getAllEvmNetworks } from "@nln/web3-evm/chain/registry/evm-network.registry"`,
      ],
    ])("rejects %s as an error", async (_label, statement) => {
      const violations = importRestrictions(
        await lintAs(STAKING_FILE, `${statement}\nexport const x = 1\n`),
      )
      expect(violations).toHaveLength(1)
      expect(violations[0]?.severity).toBe(2)
    })
  })
})
