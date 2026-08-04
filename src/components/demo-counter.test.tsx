import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { DemoCounter } from "@/components/demo-counter"
import { I18nProvider } from "@/i18n/i18n-provider"

describe("DemoCounter", () => {
  it("increments the counter", async () => {
    const user = userEvent.setup()

    render(
      <I18nProvider>
        <DemoCounter />
      </I18nProvider>,
    )

    expect(screen.getByText("0")).toBeInTheDocument()

    await user.click(
      screen.getByRole("button", {
        name: "Increment",
      }),
    )

    expect(screen.getByText("1")).toBeInTheDocument()
  })
})
