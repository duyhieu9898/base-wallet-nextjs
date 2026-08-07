// @vitest-environment node
//
// Not jsdom, and not a preference. Under jsdom, Vitest resolves the **Node**
// build of `@solana/web3.js`, which derives PDAs using Node's `Buffer`, while
// jsdom installs its own `Uint8Array` global from a separate realm. A Node
// `Buffer` then fails `instanceof Uint8Array`, which is exactly the check
// `@noble/hashes` performs — so every candidate nonce throws "Uint8Array
// expected" and the library reports the misleading "Unable to find a viable
// program address nonce".
//
// Passing `Uint8Array` seeds from the caller does not help; the Buffer is
// created inside the library. Any future test that derives a PDA needs this
// pragma too.
//
// Browsers are unaffected: they load the browser build, which carries its own
// Buffer shim. Verified in a real browser against this repository's dev server —
// `findProgramAddressSync` there returns the same address and bump as Node.

import { PublicKey } from "@solana/web3.js"
import { describe, expect, it } from "vitest"

import {
  isSameAddress,
  isSignableAddress,
  isValidAddress,
  isValidSignature,
  shortenAddress,
  shortenSignature,
  SYSTEM_PROGRAM_ADDRESS,
  toAddressKey,
  WRAPPED_SOL_MINT,
} from "./address.utils"

// A real on-curve key, generated once and pinned so the test does not depend on
// keypair generation at runtime.
const ON_CURVE = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"

// Derived, not typed by hand: a PDA is off-curve by construction, which is
// exactly the property under test.
const [PDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("test-seed")],
  new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
)

describe("isValidAddress", () => {
  it.each([ON_CURVE, SYSTEM_PROGRAM_ADDRESS, WRAPPED_SOL_MINT])(
    "accepts %s",
    (value) => {
      expect(isValidAddress(value)).toBe(true)
    },
  )

  it("accepts a program derived address", () => {
    // PDAs are off-curve but are still valid account addresses. Rejecting them
    // would reject every program-owned account the runtime must read.
    expect(isValidAddress(PDA.toBase58())).toBe(true)
  })

  it.each([
    ["empty string", ""],
    ["too short", "abc"],
    // 0 and l are not in the base58 alphabet.
    ["non-base58 characters", "0OIl0OIl0OIl0OIl0OIl0OIl0OIl0OIl"],
    ["an EVM address", "0x2170Ed0880ac9A755fd29B2688956BD959F933F8"],
  ])("rejects %s", (_label, value) => {
    expect(isValidAddress(value)).toBe(false)
  })
})

describe("isSignableAddress", () => {
  it("accepts an on-curve key", () => {
    expect(isSignableAddress(ON_CURVE)).toBe(true)
  })

  it("rejects a program derived address", () => {
    // The distinction this whole helper exists for: a PDA is a valid address
    // that no keypair can sign for, so it must never pass as a wallet or a
    // plain transfer recipient.
    expect(isSignableAddress(PDA.toBase58())).toBe(false)
  })

  it("rejects an invalid address", () => {
    expect(isSignableAddress("abc")).toBe(false)
  })
})

describe("isSameAddress", () => {
  it("matches a key against itself", () => {
    expect(isSameAddress(ON_CURVE, ON_CURVE)).toBe(true)
  })

  it("does not fold case", () => {
    // Base58 is case-sensitive. Treating these as equal — the EVM habit — would
    // report two different accounts as one.
    expect(isSameAddress(ON_CURVE, ON_CURVE.toLowerCase())).toBe(false)
  })

  it.each([
    [null, ON_CURVE],
    [ON_CURVE, undefined],
    [ON_CURVE, "abc"],
  ])("returns false for (%s, %s)", (left, right) => {
    expect(isSameAddress(left, right)).toBe(false)
  })
})

describe("isValidSignature", () => {
  it("accepts a 64-byte base58 signature", () => {
    const signature =
      "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW"

    expect(isValidSignature(signature)).toBe(true)
  })

  it("rejects a 32-byte address", () => {
    // An EVM-shaped length check would accept this. A signature is 64 bytes.
    expect(isValidSignature(ON_CURVE)).toBe(false)
  })

  it("rejects non-base58 characters", () => {
    expect(isValidSignature("0".repeat(88))).toBe(false)
  })
})

describe("shortenAddress", () => {
  it("keeps both ends", () => {
    expect(shortenAddress(ON_CURVE)).toBe("9WzD…AWWM")
  })

  it("returns an invalid address unchanged rather than disguising it", () => {
    expect(shortenAddress("not-an-address")).toBe("not-an-address")
  })
})

describe("shortenSignature", () => {
  it("keeps both ends", () => {
    expect(shortenSignature("a".repeat(88))).toBe("aaaaaa…aaaaaa")
  })
})

describe("toAddressKey", () => {
  it("returns the canonical base58 form", () => {
    expect(toAddressKey(ON_CURVE)).toBe(ON_CURVE)
  })

  it("throws on an invalid address", () => {
    // Returning the raw input would produce a cache key that never matches,
    // which surfaces later as an empty balance rather than as a bad address.
    expect(() => toAddressKey("abc")).toThrow(TypeError)
  })
})
