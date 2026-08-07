import { render, screen } from "@testing-library/react"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import type { ComponentType } from "react"
import { describe, expect, it } from "vitest"

import enDictionary from "@/i18n/dictionaries/en.json"
import jaDictionary from "@/i18n/dictionaries/ja.json"
import { I18nProvider } from "@/i18n/i18n-provider"

import { ForbiddenError } from "./forbidden-error"
import { GeneralError } from "./general-error"
import { MaintenanceError } from "./maintenance-error"
import { NotFoundError } from "./not-found-error"
import { UnauthorisedError } from "./unauthorized-error"

/**
 * These pages were copied from the admin console, where text is hardcoded
 * English. This application translates every user-facing string, so the copy had
 * to be moved into the dictionaries. That rewiring is the part worth protecting:
 * a page that renders but shows an untranslated string still looks fine in
 * review and is only wrong for a Japanese user.
 */

const pages: ReadonlyArray<{
  name: string
  code: string
  Component: ComponentType
}> = [
  { name: "401", code: "401", Component: UnauthorisedError },
  { name: "403", code: "403", Component: ForbiddenError },
  { name: "404", code: "404", Component: NotFoundError },
  { name: "500", code: "500", Component: GeneralError },
  { name: "503", code: "503", Component: MaintenanceError },
]

// The pages call useRouter/useNavigate, so they cannot mount outside a router.
async function renderPage(Component: ComponentType) {
  const rootRoute = createRootRoute({
    component: () => (
      <I18nProvider>
        <Component />
      </I18nProvider>
    ),
  })

  const router = createRouter({
    routeTree: rootRoute.addChildren([
      createRoute({
        getParentRoute: () => rootRoute,
        path: "/",
        component: () => null,
      }),
    ]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })

  await router.load()

  return render(<RouterProvider router={router} />)
}

describe("error pages", () => {
  it.each(pages)(
    "$name renders its status code and copy",
    async ({ code, Component }) => {
      await renderPage(Component)

      expect(
        screen.getByRole("heading", { level: 1, name: code }),
      ).toBeInTheDocument()
    },
  )

  it.each(pages)(
    "$name renders no string that is missing from the dictionary",
    async ({ Component }) => {
      await renderPage(Component)

      // The default locale is English, so every visible string must come from
      // the English dictionary. `undefined` leaking through means a key was
      // renamed on one side only.
      expect(document.body.textContent).not.toContain("undefined")
    },
  )

  it("keeps the Japanese dictionary in step with the English one", () => {
    // A page reads `t.errorPages.<page>.<field>`. TypeScript checks the English
    // shape because `Dictionary` is derived from it; nothing checks that the
    // Japanese file actually carries the same keys at runtime.
    const walk = (value: unknown, path: string): string[] =>
      typeof value === "object" && value !== null
        ? Object.entries(value).flatMap(([key, child]) =>
            walk(child, path ? `${path}.${key}` : key),
          )
        : [path]

    expect(walk(jaDictionary.errorPages, "").sort()).toEqual(
      walk(enDictionary.errorPages, "").sort(),
    )
  })

  it("translates when the locale is Japanese", async () => {
    window.localStorage.setItem("base-wallet:locale:v1", "ja")

    try {
      await renderPage(NotFoundError)

      expect(
        await screen.findByText(jaDictionary.errorPages.notFound.title),
      ).toBeInTheDocument()
      expect(
        screen.queryByText(enDictionary.errorPages.notFound.title),
      ).not.toBeInTheDocument()
    } finally {
      window.localStorage.clear()
    }
  })
})
