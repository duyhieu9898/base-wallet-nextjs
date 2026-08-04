import { describe, expect, it } from "vitest"

import { ApiError } from "@/lib/api/api-error"
import { shouldRetryQuery } from "@/lib/query/retry"

function apiError(status: number) {
  return new ApiError(status, { message: `status ${status}` })
}

describe("shouldRetryQuery", () => {
  it("does not retry HTTP 4xx (including 401)", () => {
    expect(shouldRetryQuery(0, apiError(400))).toBe(false)
    expect(shouldRetryQuery(0, apiError(401))).toBe(false)
    expect(shouldRetryQuery(0, apiError(404))).toBe(false)
  })

  it("retries HTTP 5xx up to 2 times", () => {
    expect(shouldRetryQuery(0, apiError(500))).toBe(true)
    expect(shouldRetryQuery(1, apiError(500))).toBe(true)
    expect(shouldRetryQuery(2, apiError(500))).toBe(false)
  })

  it("retries network errors (non-ApiError) up to 2 times", () => {
    const networkError = new TypeError("fetch failed")

    expect(shouldRetryQuery(0, networkError)).toBe(true)
    expect(shouldRetryQuery(1, networkError)).toBe(true)
    expect(shouldRetryQuery(2, networkError)).toBe(false)
  })
})
