import { describe, expect, it } from "vitest"

import {
  buildAllowanceContracts,
  mapAllowanceResults,
  normalizeAllowanceRequests,
  toAllowanceKey,
} from "@/web3/evm/reads/allowances/evm-allowance.adapter"
import { EvmWeb3Error } from "@/web3/evm/errors/evm-errors"

const TOKEN: `0x${string}` = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
const OWNER: `0x${string}` = "0x086d9feCB2F117369fAbDB884eC6851b36595444"
const SPENDER: `0x${string}` = "0x1111111111111111111111111111111111111111"

describe("toAllowanceKey", () => {
  it("produces canonical key independent of address casing", () => {
    const key1 = toAllowanceKey(11155111, OWNER, TOKEN, SPENDER)
    const key2 = toAllowanceKey(
      11155111,
      OWNER.toLowerCase() as `0x${string}`,
      TOKEN.toLowerCase() as `0x${string}`,
      SPENDER.toLowerCase() as `0x${string}`,
    )

    expect(key1).toBe(key2)
    expect(key1).toBe(
      `11155111:${OWNER.toLowerCase()}:${TOKEN.toLowerCase()}:${SPENDER.toLowerCase()}`,
    )
  })

  it("produces different keys when chainId, owner, token or spender differs", () => {
    const key1 = toAllowanceKey(11155111, OWNER, TOKEN, SPENDER)
    const key2 = toAllowanceKey(1, OWNER, TOKEN, SPENDER)
    expect(key1).not.toBe(key2)
  })
})

describe("buildAllowanceContracts", () => {
  it("builds correct multicall allowance contract objects", () => {
    const contracts = buildAllowanceContracts({
      requests: [
        { tokenAddress: TOKEN, ownerAddress: OWNER, spenderAddress: SPENDER },
      ],
    })

    expect(contracts).toHaveLength(1)
    expect(contracts[0].address).toBe(TOKEN)
    expect(contracts[0].functionName).toBe("allowance")
    expect(contracts[0].args).toEqual([OWNER, SPENDER])
  })
})

describe("normalizeAllowanceRequests", () => {
  it("resolves valid requests through registry", () => {
    const result = normalizeAllowanceRequests(11155111, [
      { tokenAddress: TOKEN, ownerAddress: OWNER, spenderAddress: SPENDER },
    ])
    expect(result).toHaveLength(1)
  })

  it("deduplicates requests with same token+owner+spender (different casing)", () => {
    const result = normalizeAllowanceRequests(11155111, [
      { tokenAddress: TOKEN, ownerAddress: OWNER, spenderAddress: SPENDER },
      {
        tokenAddress: TOKEN.toLowerCase() as `0x${string}`,
        ownerAddress: OWNER.toLowerCase() as `0x${string}`,
        spenderAddress: SPENDER.toLowerCase() as `0x${string}`,
      },
    ])
    expect(result).toHaveLength(1)
  })

  it("keeps first occurrence order", () => {
    const result = normalizeAllowanceRequests(11155111, [
      { tokenAddress: TOKEN, ownerAddress: OWNER, spenderAddress: SPENDER },
    ])
    expect(result[0].ownerAddress).toBe(OWNER)
  })

  it("rejects invalid owner address", () => {
    expect(() =>
      normalizeAllowanceRequests(11155111, [
        {
          tokenAddress: TOKEN,
          ownerAddress: "0xinvalid" as `0x${string}`,
          spenderAddress: SPENDER,
        },
      ]),
    ).toThrow()
  })

  it("rejects invalid spender address", () => {
    expect(() =>
      normalizeAllowanceRequests(11155111, [
        {
          tokenAddress: TOKEN,
          ownerAddress: OWNER,
          spenderAddress: "0xinvalid" as `0x${string}`,
        },
      ]),
    ).toThrow()
  })

  it("rejects unknown token address", () => {
    expect(() =>
      normalizeAllowanceRequests(11155111, [
        {
          tokenAddress: "0x0000000000000000000000000000000000000001",
          ownerAddress: OWNER,
          spenderAddress: SPENDER,
        },
      ]),
    ).toThrow()
  })
})

describe("mapAllowanceResults", () => {
  it("maps successful multicall allowance results", () => {
    const results = mapAllowanceResults({
      chainId: 11155111,
      requests: [
        { tokenAddress: TOKEN, ownerAddress: OWNER, spenderAddress: SPENDER },
      ],
      results: [{ status: "success", result: 100_000_000n }],
    })

    expect(results).toHaveLength(1)
    expect(results[0].status).toBe("success")
    if (results[0].status === "success") {
      expect(results[0].allowance).toBe(100_000_000n)
    }
  })

  it("throws CONTRACT_READ_FAILED when the result number does not match the request number", () => {
    let caught: unknown
    try {
      mapAllowanceResults({
        chainId: 11155111,
        requests: [
          { tokenAddress: TOKEN, ownerAddress: OWNER, spenderAddress: SPENDER },
          {
            tokenAddress: TOKEN,
            ownerAddress: OWNER,
            spenderAddress: OWNER,
          },
        ],
        results: [{ status: "success", result: 1n }],
      })
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(EvmWeb3Error)
    expect((caught as EvmWeb3Error).code).toBe("CONTRACT_READ_FAILED")
  })

  it("handles partial multicall failure for allowance", () => {
    const results = mapAllowanceResults({
      chainId: 11155111,
      requests: [
        { tokenAddress: TOKEN, ownerAddress: OWNER, spenderAddress: SPENDER },
      ],
      results: [
        { status: "failure", error: new Error("Read allowance failed") },
      ],
    })

    expect(results).toHaveLength(1)
    expect(results[0].status).toBe("failure")
    if (results[0].status === "failure") {
      expect(results[0].error).toBeInstanceOf(EvmWeb3Error)
      expect(results[0].error.code).toBe("CONTRACT_READ_FAILED")
      expect(results[0].error.message).not.toContain("Read allowance failed")
      expect((results[0].error.cause as Error).message).toContain(
        "Read allowance failed",
      )
    }
  })
})
