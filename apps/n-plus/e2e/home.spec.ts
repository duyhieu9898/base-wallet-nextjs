import { expect, test } from "@playwright/test"

test("renders the homepage", async ({ page }) => {
  await page.goto("/")

  await expect(
    page.getByRole("heading", {
      name: "Web3 Foundation",
    }),
  ).toBeVisible()
})

/**
 * Replaces the old `/api/health` assertion. The app is a static bundle with no
 * server of its own, so there is no route left to answer a health check —
 * whether the app is serving is exactly whether it boots and renders.
 */
test("boots the client application", async ({ page }) => {
  const consoleErrors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  })

  await page.goto("/")

  await expect(page.locator("#root")).not.toBeEmpty()
  expect(consoleErrors).toEqual([])
})
