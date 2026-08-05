import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { I18nProvider } from "@/i18n/i18n-provider"
import {
  TransactionFeedbackProvider,
  useTransactionFeedbackController,
} from "./transaction-feedback"

function Controls() {
  const feedback = useTransactionFeedbackController()

  function create(phase: "success" | "reverted" | "rejected") {
    const id = feedback.begin({ title: `Transaction ${phase}` })
    feedback.update({ id, phase })
  }

  return (
    <>
      <button onClick={() => create("success")}>success</button>
      <button onClick={() => create("reverted")}>reverted</button>
      <button onClick={() => create("rejected")}>rejected</button>
    </>
  )
}

function renderFeedback() {
  return render(
    <I18nProvider>
      <TransactionFeedbackProvider>
        <Controls />
      </TransactionFeedbackProvider>
    </I18nProvider>,
  )
}

afterEach(() => {
  vi.useRealTimers()
})

describe("TransactionFeedbackProvider", () => {
  it("automatically dismisses successful notifications after five seconds", () => {
    vi.useFakeTimers()
    renderFeedback()

    fireEvent.click(screen.getByRole("button", { name: "success" }))
    expect(screen.getByText("Transaction confirmed")).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(4_999))
    expect(screen.getByText("Transaction confirmed")).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1))
    expect(screen.queryByText("Transaction confirmed")).not.toBeInTheDocument()
  })

  it("keeps reverted notifications until the user dismisses them", () => {
    vi.useFakeTimers()
    renderFeedback()

    fireEvent.click(screen.getByRole("button", { name: "reverted" }))
    act(() => vi.advanceTimersByTime(10_000))
    expect(screen.getAllByText("Transaction reverted")).toHaveLength(2)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Dismiss transaction notification",
      }),
    )
    expect(
      screen.queryByRole("button", {
        name: "Dismiss transaction notification",
      }),
    ).not.toBeInTheDocument()
  })

  it("automatically dismisses rejected notifications after three seconds", () => {
    vi.useFakeTimers()
    renderFeedback()

    fireEvent.click(screen.getByRole("button", { name: "rejected" }))
    expect(screen.getByText("Request cancelled")).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(2_999))
    expect(screen.getByText("Request cancelled")).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1))
    expect(screen.queryByText("Request cancelled")).not.toBeInTheDocument()
  })

  it("shows only the two most recent notifications", () => {
    renderFeedback()

    fireEvent.click(screen.getByRole("button", { name: "success" }))
    fireEvent.click(screen.getByRole("button", { name: "reverted" }))
    fireEvent.click(screen.getByRole("button", { name: "rejected" }))

    expect(screen.queryByText("Transaction success")).not.toBeInTheDocument()
    expect(screen.getAllByText("Transaction reverted")).toHaveLength(2)
    expect(screen.getByText("Transaction rejected")).toBeInTheDocument()
  })
})
