import { QueryClient, type QueryFilters } from "@tanstack/react-query"
import type { Address } from "viem"
import { describe, expect, it } from "vitest"
import {
  getBalanceQueryKey,
  readContractQueryKey,
  readContractsQueryKey,
} from "wagmi/query"

import { standardErc20Abi } from "@/web3/evm/abi/erc20"
import { buildEvmWriteInvalidationFilters } from "@/web3/evm/transactions/invalidation/evm-invalidation.adapter"

const CHAIN_ID = 11155111
const ACCOUNT: Address = "0x086d9feCB2F117369fAbDB884eC6851b36595444"
const OTHER_ACCOUNT: Address = "0x1111111111111111111111111111111111111111"
const SPENDER: Address = "0x2222222222222222222222222222222222222222"
const TOKEN: Address = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
const OTHER_TOKEN: Address = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"

/**
 * Build a cache that contains the exact queries that read hooks register, using the builder itself
 * of Wagmi so that the key is identical to the runtime.
 */
function seedCache() {
  const client = new QueryClient()

  const keys = {
    nativeBalance: getBalanceQueryKey({ address: ACCOUNT, chainId: CHAIN_ID }),
    otherNativeBalance: getBalanceQueryKey({
      address: OTHER_ACCOUNT,
      chainId: CHAIN_ID,
    }),
    tokenBalance: readContractQueryKey({
      address: TOKEN,
      abi: standardErc20Abi,
      functionName: "balanceOf",
      args: [ACCOUNT],
      chainId: CHAIN_ID,
    }),
    otherTokenBalance: readContractQueryKey({
      address: OTHER_TOKEN,
      abi: standardErc20Abi,
      functionName: "balanceOf",
      args: [ACCOUNT],
      chainId: CHAIN_ID,
    }),
    allowance: readContractQueryKey({
      address: TOKEN,
      abi: standardErc20Abi,
      functionName: "allowance",
      args: [ACCOUNT, SPENDER],
      chainId: CHAIN_ID,
    }),
    tokenSymbol: readContractQueryKey({
      address: TOKEN,
      abi: standardErc20Abi,
      functionName: "symbol",
      chainId: CHAIN_ID,
    }),
    // Multicall balance of this exact token
    balanceMulticall: readContractsQueryKey({
      contracts: [
        {
          address: TOKEN,
          abi: standardErc20Abi,
          functionName: "balanceOf",
          args: [ACCOUNT],
          chainId: CHAIN_ID,
        },
      ],
    }),
    // Multicall allowance of this exact token
    allowanceMulticall: readContractsQueryKey({
      contracts: [
        {
          address: TOKEN,
          abi: standardErc20Abi,
          functionName: "allowance",
          args: [ACCOUNT, SPENDER],
          chainId: CHAIN_ID,
        },
      ],
    }),
    // Multicall of other tokens — not touched
    otherTokenMulticall: readContractsQueryKey({
      contracts: [
        {
          address: OTHER_TOKEN,
          abi: standardErc20Abi,
          functionName: "balanceOf",
          args: [ACCOUNT],
          chainId: CHAIN_ID,
        },
      ],
    }),
    // Multicall of other features in the app — not touched
    unrelatedMulticall: readContractsQueryKey({
      contracts: [
        {
          address: OTHER_TOKEN,
          abi: standardErc20Abi,
          functionName: "totalSupply",
          chainId: CHAIN_ID,
        },
      ],
    }),
  }

  for (const key of Object.values(keys)) {
    client.setQueryData(key, "seeded")
  }

  return { client, keys }
}

/** Names of queries matched by the filter. */
function matchedNames(
  client: QueryClient,
  keys: Record<string, readonly unknown[]>,
  filters: readonly QueryFilters[],
): string[] {
  const matched = new Set<string>()

  for (const filter of filters) {
    for (const query of client.getQueryCache().findAll(filter)) {
      const name = Object.entries(keys).find(
        ([, candidate]) =>
          JSON.stringify(candidate) === JSON.stringify(query.queryKey),
      )?.[0]
      if (name) matched.add(name)
    }
  }

  return [...matched].sort()
}

describe("buildEvmWriteInvalidationFilters", () => {
  it("native transfer only touches the account's native balance", () => {
    const { client, keys } = seedCache()

    expect(
      matchedNames(
        client,
        keys,
        buildEvmWriteInvalidationFilters({
          kind: "native-transfer",
          chainId: CHAIN_ID,
          account: ACCOUNT,
        }),
      ),
    ).toEqual(["nativeBalance"])
  })

  it("The transfer token touches the balanceOf of that token, not metadata or other tokens", () => {
    const { client, keys } = seedCache()
    const matched = matchedNames(
      client,
      keys,
      buildEvmWriteInvalidationFilters({
        kind: "token-transfer",
        chainId: CHAIN_ID,
        account: ACCOUNT,
        tokenAddress: TOKEN,
      }),
    )

    expect(matched).toContain("tokenBalance")
    expect(matched).toContain("balanceMulticall")
    expect(matched).not.toContain("tokenSymbol")
    expect(matched).not.toContain("otherTokenBalance")
  })

  it("approve touches the allowance of that token, not balanceOf", () => {
    const { client, keys } = seedCache()
    const matched = matchedNames(
      client,
      keys,
      buildEvmWriteInvalidationFilters({
        kind: "token-approval",
        chainId: CHAIN_ID,
        account: ACCOUNT,
        tokenAddress: TOKEN,
      }),
    )

    expect(matched).toContain("allowance")
    expect(matched).toContain("allowanceMulticall")
    expect(matched).not.toContain("tokenBalance")
    expect(matched).not.toContain("balanceMulticall")
    expect(matched).not.toContain("tokenSymbol")
  })

  it("Do not touch multicall of other tokens or unrelated features", () => {
    const { client, keys } = seedCache()

    for (const kind of ["token-transfer", "token-approval"] as const) {
      const matched = matchedNames(
        client,
        keys,
        buildEvmWriteInvalidationFilters({
          kind,
          chainId: CHAIN_ID,
          account: ACCOUNT,
          tokenAddress: TOKEN,
        }),
      )

      expect(matched).not.toContain("otherTokenMulticall")
      expect(matched).not.toContain("unrelatedMulticall")
    }
  })

  it("Every type of write refreshes the native balance because every transaction burns gas", () => {
    for (const kind of [
      "native-transfer",
      "token-transfer",
      "token-approval",
    ] as const) {
      const { client, keys } = seedCache()
      const matched = matchedNames(
        client,
        keys,
        buildEvmWriteInvalidationFilters({
          kind,
          chainId: CHAIN_ID,
          account: ACCOUNT,
          tokenAddress: TOKEN,
        }),
      )

      expect(matched).toContain("nativeBalance")
      expect(matched).not.toContain("otherNativeBalance")
    }
  })

  it("The multicall predicate matches regardless of the casing of the address in the contract", () => {
    const client = new QueryClient()
    const key = readContractsQueryKey({
      contracts: [
        {
          address: TOKEN.toLowerCase() as Address,
          abi: standardErc20Abi,
          functionName: "balanceOf",
          args: [ACCOUNT],
          chainId: CHAIN_ID,
        },
      ],
    })
    client.setQueryData(key, "seeded")

    const filters = buildEvmWriteInvalidationFilters({
      kind: "token-transfer",
      chainId: CHAIN_ID,
      account: ACCOUNT,
      tokenAddress: TOKEN,
    })

    const matched = filters.some(
      (filter) => client.getQueryCache().findAll(filter).length > 0,
    )
    expect(matched).toBe(true)
  })

  it("Do not touch another chain's query", () => {
    const client = new QueryClient()
    client.setQueryData(
      readContractQueryKey({
        address: TOKEN,
        abi: standardErc20Abi,
        functionName: "balanceOf",
        args: [ACCOUNT],
        chainId: 1,
      }),
      "seeded",
    )
    client.setQueryData(
      readContractsQueryKey({
        contracts: [
          {
            address: TOKEN,
            abi: standardErc20Abi,
            functionName: "balanceOf",
            args: [ACCOUNT],
            chainId: 1,
          },
        ],
      }),
      "seeded",
    )

    const filters = buildEvmWriteInvalidationFilters({
      kind: "token-transfer",
      chainId: CHAIN_ID,
      account: ACCOUNT,
      tokenAddress: TOKEN,
    })

    for (const filter of filters) {
      expect(client.getQueryCache().findAll(filter)).toHaveLength(0)
    }
  })

  it("If the tokenAddress is missing, the native balance will still refresh, ignoring the token filter", () => {
    const filters = buildEvmWriteInvalidationFilters({
      kind: "token-transfer",
      chainId: CHAIN_ID,
      account: ACCOUNT,
    })

    expect(filters).toEqual([
      { queryKey: getBalanceQueryKey({ address: ACCOUNT, chainId: CHAIN_ID }) },
    ])
  })
})
