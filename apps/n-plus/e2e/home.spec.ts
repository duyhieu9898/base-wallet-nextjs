import { expect, test } from "@playwright/test"

test("renders the homepage", async ({ page }) => {
  await page.goto("/")

  await expect(
    page.getByRole("heading", {
      name: "Web3 Foundation",
    }),
  ).toBeVisible()
})

test("health API returns ok", async ({ request }) => {
  const response = await request.get("/api/health")

  expect(response.ok()).toBe(true)

  await expect(response.json()).resolves.toMatchObject({
    status: "ok",
  })
})
