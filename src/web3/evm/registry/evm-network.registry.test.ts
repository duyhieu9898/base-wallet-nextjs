import { describe, expect, it } from "vitest"

import { EvmWeb3Error } from "@/web3/evm/errors"
import { hydrateTokens } from "@/web3/evm/registry/evm-network.registry"

const USDC_SEPOLIA = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"

function rawToken(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    type: "erc20",
    symbol: "USDC",
    name: "USD Coin",
    expectedDecimals: 6,
    enabled: true,
    ...overrides,
  }
}

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn()
    return undefined
  } catch (error) {
    return error instanceof EvmWeb3Error ? error.code : `NOT_TYPED:${error}`
  }
}

describe("hydrateTokens", () => {
  it("Normalize the address key to lowercase and keep the original address in the config when valid token hydrate is successful", () => {
    const hydrated = hydrateTokens({ [USDC_SEPOLIA]: rawToken() })
    const key = USDC_SEPOLIA.toLowerCase()

    expect(Object.keys(hydrated)).toEqual([key])
    expect(hydrated[key].address).toBe(USDC_SEPOLIA)
    expect(hydrated[key].symbol).toBe("USDC")
    expect(hydrated[key].name).toBe("USD Coin")
    expect(hydrated[key].expectedDecimals).toBe(6)
    expect(hydrated[key].enabled).toBe(true)
  })

  it("reject malformed address with code INVALID_ADDRESS", () => {
    expect(codeOf(() => hydrateTokens({ "0xnope": rawToken() }))).toBe(
      "INVALID_ADDRESS",
    )
  })

  it("reject top-level rawTokens null, array or string with code TOKEN_METADATA_MISMATCH", () => {
    expect(codeOf(() => hydrateTokens(null))).toBe("TOKEN_METADATA_MISMATCH")
    expect(codeOf(() => hydrateTokens([]))).toBe("TOKEN_METADATA_MISMATCH")
    expect(codeOf(() => hydrateTokens("invalid"))).toBe(
      "TOKEN_METADATA_MISMATCH",
    )
  })

  it("reject duplicate address just different casing with code TOKEN_METADATA_MISMATCH", () => {
    expect(
      codeOf(() =>
        hydrateTokens({
          [USDC_SEPOLIA]: rawToken(),
          [USDC_SEPOLIA.toLowerCase()]: rawToken({ symbol: "USDC2" }),
        }),
      ),
    ).toBe("TOKEN_METADATA_MISMATCH")
  })

  it("reject raw null with code TOKEN_METADATA_MISMATCH", () => {
    expect(
      codeOf(() =>
        hydrateTokens({
          [USDC_SEPOLIA]: null as unknown as Record<string, unknown>,
        }),
      ),
    ).toBe("TOKEN_METADATA_MISMATCH")
  })

  it("reject raw array with code TOKEN_METADATA_MISMATCH", () => {
    expect(
      codeOf(() =>
        hydrateTokens({
          [USDC_SEPOLIA]: [] as unknown as Record<string, unknown>,
        }),
      ),
    ).toBe("TOKEN_METADATA_MISMATCH")
  })

  it("reject type is wrong with code TOKEN_METADATA_MISMATCH", () => {
    expect(
      codeOf(() =>
        hydrateTokens({ [USDC_SEPOLIA]: rawToken({ type: "erc721" }) }),
      ),
    ).toBe("TOKEN_METADATA_MISMATCH")
  })

  it("reject symbol is empty or only contains whitespace with code TOKEN_METADATA_MISMATCH", () => {
    expect(
      codeOf(() => hydrateTokens({ [USDC_SEPOLIA]: rawToken({ symbol: "" }) })),
    ).toBe("TOKEN_METADATA_MISMATCH")

    expect(
      codeOf(() =>
        hydrateTokens({ [USDC_SEPOLIA]: rawToken({ symbol: "   " }) }),
      ),
    ).toBe("TOKEN_METADATA_MISMATCH")
  })

  it("reject name is empty or only contains whitespace with code TOKEN_METADATA_MISMATCH", () => {
    expect(
      codeOf(() => hydrateTokens({ [USDC_SEPOLIA]: rawToken({ name: "" }) })),
    ).toBe("TOKEN_METADATA_MISMATCH")

    expect(
      codeOf(() =>
        hydrateTokens({ [USDC_SEPOLIA]: rawToken({ name: " \t " }) }),
      ),
    ).toBe("TOKEN_METADATA_MISMATCH")
  })

  it("reject enabled is not a boolean with code TOKEN_METADATA_MISMATCH", () => {
    expect(
      codeOf(() =>
        hydrateTokens({ [USDC_SEPOLIA]: rawToken({ enabled: "true" }) }),
      ),
    ).toBe("TOKEN_METADATA_MISMATCH")

    expect(
      codeOf(() => hydrateTokens({ [USDC_SEPOLIA]: rawToken({ enabled: 1 }) })),
    ).toBe("TOKEN_METADATA_MISMATCH")
  })

  it("reject negative or non-integer decimals with code TOKEN_METADATA_MISMATCH", () => {
    expect(
      codeOf(() =>
        hydrateTokens({
          [USDC_SEPOLIA]: rawToken({ expectedDecimals: -1 }),
        }),
      ),
    ).toBe("TOKEN_METADATA_MISMATCH")

    expect(
      codeOf(() =>
        hydrateTokens({
          [USDC_SEPOLIA]: rawToken({ expectedDecimals: 6.5 }),
        }),
      ),
    ).toBe("TOKEN_METADATA_MISMATCH")
  })

  it("An empty map is valid (the network has not yet configured any tokens).", () => {
    expect(hydrateTokens({})).toEqual({})
    expect(hydrateTokens()).toEqual({})
  })
})
