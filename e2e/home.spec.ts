import { expect, test } from "@playwright/test"

test("renders the homepage", async ({ page }) => {
  await page.goto("/")

  await expect(
    page.getByRole("heading", {
      name: "Next.js blank project",
    }),
  ).toBeVisible()

  await expect(
    page.getByRole("button", {
      name: "Tăng",
    }),
  ).toBeVisible()
})

test("increments the counter", async ({ page }) => {
  await page.goto("/")

  await expect(page.getByText("0")).toBeVisible()

  await page
    .getByRole("button", {
      name: "Tăng",
    })
    .click()

  await expect(page.getByText("1")).toBeVisible()
})

test("health API returns ok", async ({ request }) => {
  const response = await request.get("/api/health")

  expect(response.ok()).toBe(true)

  await expect(response.json()).resolves.toMatchObject({
    status: "ok",
  })
})
