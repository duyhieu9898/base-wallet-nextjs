import { describe, expect, it } from "vitest"
import { BaseError, UserRejectedRequestError } from "viem"

import { isUserRejectedWalletRequest } from "./evm-wallet-rejection"

describe("isUserRejectedWalletRequest", () => {
  it("detects a viem UserRejectedRequestError", () => {
    expect(
      isUserRejectedWalletRequest(
        new UserRejectedRequestError(new Error("rejected")),
      ),
    ).toBe(true)
  })

  it("detects a rejection nested inside a viem error chain", () => {
    const nested = new BaseError("Request failed", {
      cause: new UserRejectedRequestError(new Error("rejected")),
    })

    expect(isUserRejectedWalletRequest(nested)).toBe(true)
  })

  it("detects a raw EIP-1193 rejection that never went through viem", () => {
    expect(isUserRejectedWalletRequest({ code: 4001 })).toBe(true)
  })

  it("detects a rejection wrapped by another layer via cause", () => {
    expect(
      isUserRejectedWalletRequest(
        new Error("wrapper", { cause: { code: 4001 } }),
      ),
    ).toBe(true)
  })

  it("is false for other wallet or RPC failures", () => {
    expect(isUserRejectedWalletRequest(new Error("boom"))).toBe(false)
    expect(isUserRejectedWalletRequest({ code: -32000 })).toBe(false)
    expect(isUserRejectedWalletRequest(new BaseError("insufficient"))).toBe(
      false,
    )
  })

  it("is false for non-error values", () => {
    expect(isUserRejectedWalletRequest(null)).toBe(false)
    expect(isUserRejectedWalletRequest(undefined)).toBe(false)
    expect(isUserRejectedWalletRequest("rejected")).toBe(false)
  })

  it("terminates on a circular cause chain", () => {
    const circular: { name: string; cause?: unknown } = { name: "Weird" }
    circular.cause = circular

    expect(isUserRejectedWalletRequest(circular)).toBe(false)
  })
})
