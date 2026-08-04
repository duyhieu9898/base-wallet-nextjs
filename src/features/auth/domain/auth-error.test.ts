import { describe, expect, it } from "vitest"

import { ApiError } from "@/lib/api/api-error"
import {
  createAuthError,
  isRefreshableAuthError,
  toRefreshAuthError,
  toSignatureAuthError,
} from "./auth-error"

describe("isRefreshableAuthError", () => {
  it("is true for an expired access token", () => {
    expect(
      isRefreshableAuthError(
        new ApiError(401, { code: "ACCESS_TOKEN_EXPIRED" }),
      ),
    ).toBe(true)
  })

  it("is true for a 401 without a code", () => {
    expect(isRefreshableAuthError(new ApiError(401))).toBe(true)
  })

  it("is false for a rejected SIWE signature", () => {
    expect(
      isRefreshableAuthError(
        new ApiError(401, { code: "INVALID_SIWE_SIGNATURE" }),
      ),
    ).toBe(false)
  })

  it("is false for a revoked refresh session", () => {
    expect(
      isRefreshableAuthError(
        new ApiError(401, { code: "REFRESH_SESSION_REVOKED" }),
      ),
    ).toBe(false)
  })

  it("is false for non-401 statuses", () => {
    expect(isRefreshableAuthError(new ApiError(403))).toBe(false)
    expect(isRefreshableAuthError(new ApiError(500))).toBe(false)
    expect(isRefreshableAuthError(new Error("network"))).toBe(false)
  })
})

/**
 * `toRefreshAuthError` is representative of the entire mapper group passing through
 * `toApiAuthError`. `toVerifyAuthError` / `toLogoutAuthError` are just different constants
 * code and messages, they should be retested without adding any evidence.
 */
describe("toRefreshAuthError", () => {
  it("classifies a 401 as terminal rejection", () => {
    expect(toRefreshAuthError(new ApiError(401)).code).toBe("REFRESH_REJECTED")
  })

  it("classifies a 500 as undetermined, not unauthenticated", () => {
    expect(toRefreshAuthError(new ApiError(500)).code).toBe("REFRESH_FAILED")
  })

  it("classifies a network error as undetermined", () => {
    expect(toRefreshAuthError(new TypeError("Failed to fetch")).code).toBe(
      "REFRESH_FAILED",
    )
  })

  it("passes an existing AuthError through unchanged", () => {
    const original = createAuthError("REFRESH_REJECTED", "already mapped")

    expect(toRefreshAuthError(original)).toBe(original)
  })
})

describe("toSignatureAuthError", () => {
  it("detects an EIP-1193 user rejection", () => {
    expect(toSignatureAuthError({ code: 4001 }).code).toBe("SIGNATURE_REJECTED")
  })

  it("detects a viem UserRejectedRequestError by name", () => {
    const error = new Error("rejected")
    error.name = "UserRejectedRequestError"

    expect(toSignatureAuthError(error).code).toBe("SIGNATURE_REJECTED")
  })

  it("detects a rejection nested in cause", () => {
    const error = new Error("wrapper", { cause: { code: 4001 } })

    expect(toSignatureAuthError(error).code).toBe("SIGNATURE_REJECTED")
  })

  it("maps other wallet failures to SIGNATURE_FAILED", () => {
    expect(toSignatureAuthError(new Error("boom")).code).toBe(
      "SIGNATURE_FAILED",
    )
  })

  it("keeps only the first line of a multi-line wallet message", () => {
    const error = toSignatureAuthError(
      new Error("Signing failed.\nDetails: {...}\nVersion: viem@2.0.0"),
    )

    expect(error.message).toBe("Signing failed.")
  })
})
