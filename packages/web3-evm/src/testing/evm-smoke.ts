/**
 * Live RPC smoke verification for the foundation (execution plan §8.3).
 *
 * The logic lives in the package because it verifies the package: registry
 * resolution, RPC transport, the ERC-20 read services and their multicall
 * behaviour, checked against real chains rather than mocks.
 *
 * It reads the installed runtime config rather than building one, so it is also
 * a second consumer proving the acceptance criterion of §4.1 — a caller
 * configures the foundation without editing anything inside it.
 *
 * Output goes through injected loggers: the package produces results, the entry
 * script decides how they are presented.
 */

import { standardErc20Abi } from "../abi/erc20"
import {
  getAllEvmNetworks,
  getEvmNetworkRpcUrl,
  getEvmTokensForChain,
} from "../chain/registry/evm-registry.adapter"
import { createEvmPublicClient } from "../clients/create-evm-public-client"
import { getEvmAllowances } from "../reads/allowances/evm-allowance.service"
import { getEvmBalances } from "../reads/balances/evm-balance.service"

export type EvmSmokeRow = {
  network: string
  chainId: string
  expectedChainId: string
  block: string
  tokenAddress: string
  bytecode: string
  name: string
  symbol: string
  decimals: string
  rpcUrl: string
  status: "ok" | "fail"
  error?: string
}

export type EvmSmokeSummary = {
  rows: EvmSmokeRow[]
  networksChecked: number
  networksPassed: number
  networksFailed: number
  tokensChecked: number
  balanceChecks: number
  allowanceChecks: number
}

export type EvmSmokeOptions = {
  /** Limit the run to one chain. `null` runs every configured network. */
  onlyChainId?: number | null
  /** Per-request budget. A hung RPC must fail the run, not stall it forever. */
  timeoutMs?: number
  log?: (message: string) => void
  logError?: (message: string) => void
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`timeout after ${ms}ms (${label})`)),
          ms,
        )
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function runEvmSmoke(
  options: EvmSmokeOptions = {},
): Promise<EvmSmokeSummary> {
  const {
    onlyChainId = null,
    timeoutMs = 45_000,
    log = () => {},
    logError = () => {},
  } = options

  const allNetworks = getAllEvmNetworks()
  const networks =
    onlyChainId === null
      ? allNetworks
      : allNetworks.filter((network) => network.chain.id === onlyChainId)

  if (networks.length === 0) {
    throw new Error(
      `No EVM network in registry for chainId ${onlyChainId}. Available: ${allNetworks
        .map((network) => network.chain.id)
        .join(", ")}`,
    )
  }

  log(
    onlyChainId === null
      ? `Running smoke on all ${networks.length} networks`
      : `Running smoke on chainId ${onlyChainId}`,
  )

  const rows: EvmSmokeRow[] = []
  let networksChecked = 0
  let networksPassed = 0
  let networksFailed = 0
  let tokensChecked = 0
  let balanceChecks = 0
  let allowanceChecks = 0

  for (const network of networks) {
    networksChecked += 1
    const base = {
      network: network.key,
      expectedChainId: String(network.chain.id),
      rpcUrl: getEvmNetworkRpcUrl(network),
    }

    try {
      const client = createEvmPublicClient(network.chain.id)
      const tokenList = getEvmTokensForChain(network.chain.id)
      if (tokenList.length === 0) {
        throw new Error(`No enabled token configured on ${network.key}`)
      }

      const TIMEOUT = timeoutMs

      const chainId = await withTimeout(
        client.getChainId(),
        TIMEOUT,
        "getChainId",
      )
      if (chainId !== network.chain.id) {
        throw new Error(`chainId ${chainId} != expected ${network.chain.id}`)
      }

      const block = await withTimeout(
        client.getBlockNumber(),
        TIMEOUT,
        "getBlockNumber",
      )

      // Iterate ALL enabled tokens for metadata validation
      for (const token of tokenList) {
        tokensChecked += 1
        const bytecode = await withTimeout(
          client.getCode({ address: token.address }),
          TIMEOUT,
          `getCode(${token.symbol})`,
        )
        if (!bytecode || bytecode === "0x") {
          throw new Error(`no bytecode at ${token.address} (${token.symbol})`)
        }

        const [name, symbol, decimals] = await withTimeout(
          Promise.all([
            client.readContract({
              address: token.address,
              abi: standardErc20Abi,
              functionName: "name",
            }),
            client.readContract({
              address: token.address,
              abi: standardErc20Abi,
              functionName: "symbol",
            }),
            client.readContract({
              address: token.address,
              abi: standardErc20Abi,
              functionName: "decimals",
            }),
          ]),
          TIMEOUT,
          `readContract metadata(${token.symbol})`,
        )

        if (symbol !== token.symbol) {
          throw new Error(
            `onchain symbol "${symbol}" != expected "${token.symbol}" for ${token.address}`,
          )
        }
        const onchainDecimals = Number(decimals)
        if (onchainDecimals !== token.expectedDecimals) {
          throw new Error(
            `onchain decimals ${onchainDecimals} != expected ${token.expectedDecimals} for ${token.address}`,
          )
        }
        if (!name) {
          throw new Error(`onchain name is empty for ${token.address}`)
        }

        rows.push({
          ...base,
          chainId: String(chainId),
          block: String(block),
          tokenAddress: token.address,
          bytecode: "found",
          name,
          symbol,
          decimals: String(onchainDecimals),
          status: "ok",
        })

        log(
          `  ✅ ${token.symbol} (${token.address}): name="${name}" decimals=${onchainDecimals}`,
        )
      }

      // Test multicall getEvmBalances — result count should match token list
      const READ_ADDR = "0x0000000000000000000000000000000000000000"
      const balances = await withTimeout(
        getEvmBalances({
          chainId: network.chain.id,
          walletAddress: READ_ADDR,
        }),
        TIMEOUT,
        "getEvmBalances",
      )

      if (balances.tokens.length !== tokenList.length) {
        throw new Error(
          `getEvmBalances result count ${balances.tokens.length} != token list count ${tokenList.length}`,
        )
      }

      // Partial failure is a failure: multicall uses allowFailure so a token
      // read error still returns normally — smoke must report failure instead of exit 0.
      const balanceFailures: string[] = []

      for (const result of balances.tokens) {
        balanceChecks += 1
        if (result.status === "success") {
          if (typeof result.balance.rawAmount !== "bigint") {
            throw new Error(`Balance for ${result.tokenAddress} is not bigint`)
          }
          log(
            `  ✅ balance(${result.tokenAddress}): ${result.balance.formattedAmount} ${result.balance.symbol}`,
          )
        } else {
          logError(
            `  ❌ balance(${result.tokenAddress}) FAILED: ${result.error.message}`,
          )
          balanceFailures.push(
            `${result.tokenAddress}: ${result.error.message}`,
          )
        }
      }

      if (balanceFailures.length > 0) {
        throw new Error(
          `getEvmBalances has ${balanceFailures.length} tokens with read errors — ${balanceFailures.join("; ")}`,
        )
      }

      // Test multicall getEvmAllowances with all tokens
      const allowanceRequests = tokenList.map((token) => ({
        tokenAddress: token.address,
        ownerAddress: READ_ADDR as `0x${string}`,
        spenderAddress: READ_ADDR as `0x${string}`,
      }))

      const allowances = await withTimeout(
        getEvmAllowances({
          chainId: network.chain.id,
          requests: allowanceRequests,
        }),
        TIMEOUT,
        "getEvmAllowances",
      )

      if (allowances.length !== tokenList.length) {
        throw new Error(
          `getEvmAllowances result count ${allowances.length} != token list count ${tokenList.length}`,
        )
      }

      const allowanceFailures: string[] = []

      for (const result of allowances) {
        allowanceChecks += 1
        if (result.status === "success") {
          if (typeof result.allowance !== "bigint") {
            throw new Error(
              `Allowance for ${result.request.tokenAddress} is not bigint`,
            )
          }
          log(
            `  ✅ allowance(${result.request.tokenAddress}): ${result.allowance}`,
          )
        } else {
          logError(
            `  ❌ allowance(${result.request.tokenAddress}) FAILED: ${result.error.message}`,
          )
          allowanceFailures.push(
            `${result.request.tokenAddress}: ${result.error.message}`,
          )
        }
      }

      if (allowanceFailures.length > 0) {
        throw new Error(
          `getEvmAllowances has ${allowanceFailures.length} tokens with read errors — ${allowanceFailures.join("; ")}`,
        )
      }

      networksPassed += 1
      log(
        `✅ ${network.key}: chainId=${chainId} block=${block} tokens=${tokenList.length} rpc=${base.rpcUrl}`,
      )
    } catch (error) {
      networksFailed += 1
      const message = error instanceof Error ? error.message : String(error)
      rows.push({
        ...base,
        chainId: "-",
        block: "-",
        tokenAddress: "-",
        bytecode: "-",
        name: "-",
        symbol: "-",
        decimals: "-",
        status: "fail",
        error: message,
      })
      logError(`❌ ${network.key}: ${message}`)
    }
  }

  return {
    rows,
    networksChecked,
    networksPassed,
    networksFailed,
    tokensChecked,
    balanceChecks,
    allowanceChecks,
  }
}
