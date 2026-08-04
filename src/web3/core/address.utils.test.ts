import { describe, expect, it } from "vitest"
import { zeroAddress } from "viem"

import {
  isSameAddress,
  isValidAddress,
  isZeroAddress,
  toChecksumAddress,
  truncateAddress,
} from "./address.utils"

const ALICE_CHECKSUM = "0x086d9feCB2F117369fAbDB884eC6851b36595444"
const ALICE_LOWER = "0x086d9fecb2f117369fabdb884ec6851b36595444"
const BOB = "0x1111111111111111111111111111111111111111"

describe("address.utils", () => {
  describe("isValidAddress", () => {
    it("returns true for valid checksum and lowercase addresses", () => {
      expect(isValidAddress(ALICE_CHECKSUM)).toBe(true)
      expect(isValidAddress(ALICE_LOWER)).toBe(true)
    })

    it("returns false for null, undefined, empty, or invalid format", () => {
      expect(isValidAddress(null)).toBe(false)
      expect(isValidAddress(undefined)).toBe(false)
      expect(isValidAddress("")).toBe(false)
      expect(isValidAddress("0xinvalid")).toBe(false)
      expect(isValidAddress("12345")).toBe(false)
    })
  })

  describe("isSameAddress", () => {
    it("returns true when comparing checksum vs lowercase address", () => {
      expect(isSameAddress(ALICE_CHECKSUM, ALICE_LOWER)).toBe(true)
      expect(isSameAddress(ALICE_LOWER, ALICE_CHECKSUM)).toBe(true)
    })

    it("returns false when addresses differ", () => {
      expect(isSameAddress(ALICE_CHECKSUM, BOB)).toBe(false)
    })

    it("returns false if either parameter is null, undefined, or invalid", () => {
      expect(isSameAddress(ALICE_CHECKSUM, null)).toBe(false)
      expect(isSameAddress(undefined, ALICE_LOWER)).toBe(false)
      expect(isSameAddress("0xinvalid", ALICE_LOWER)).toBe(false)
    })
  })

  describe("isZeroAddress", () => {
    it("returns true for zero address in any casing", () => {
      expect(isZeroAddress(zeroAddress)).toBe(true)
      expect(isZeroAddress("0x0000000000000000000000000000000000000000")).toBe(
        true,
      )
    })

    it("returns false for normal addresses or null/invalid inputs", () => {
      expect(isZeroAddress(ALICE_CHECKSUM)).toBe(false)
      expect(isZeroAddress(null)).toBe(false)
      expect(isZeroAddress("0xinvalid")).toBe(false)
    })
  })

  describe("truncateAddress", () => {
    it("truncates address with default format (0x086d...5444)", () => {
      expect(truncateAddress(ALICE_CHECKSUM)).toBe("0x086d...5444")
    })

    it("supports custom start/end lengths", () => {
      expect(truncateAddress(ALICE_CHECKSUM, 4, 2)).toBe("0x08...44")
    })

    it("returns empty string for null, undefined, or invalid inputs", () => {
      expect(truncateAddress(null)).toBe("")
      expect(truncateAddress(undefined)).toBe("")
      expect(truncateAddress("0xinvalid")).toBe("")
    })
  })

  describe("toChecksumAddress", () => {
    it("returns checksummed format", () => {
      expect(toChecksumAddress(ALICE_LOWER)).toBe(ALICE_CHECKSUM)
    })

    it("throws for invalid address", () => {
      expect(() => toChecksumAddress("0xinvalid")).toThrow()
    })
  })
})
