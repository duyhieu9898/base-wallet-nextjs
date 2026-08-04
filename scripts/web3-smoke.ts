import { loadEnvLocal } from "./load-env"

type Row = {
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

/**
 * `--chainId <id>` giới hạn smoke vào một network. Không truyền thì chạy toàn bộ
 * registry (bao gồm cả mainnet).
 */
function parseChainIdArg(argv: readonly string[]): number | null {
  const index = argv.indexOf("--chainId")
  if (index === -1) return null

  const raw = argv[index + 1]
  const parsed = Number(raw)
  if (!raw || !Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `--chainId requires a positive integer chain ID, received "${raw ?? ""}".`,
    )
  }
  return parsed
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

async function main() {
  loadEnvLocal()

  const { getAllEvmNetworks, getEvmNetworkRpcUrl, getEvmTokensForChain } =
    await import("../src/web3/evm/adapters/evm-registry.adapter")
  const { createEvmPublicClient } =
    await import("../src/web3/evm/clients/create-evm-public-client")
  const { standardErc20Abi } = await import("../src/web3/evm/abi/erc20")
  const { getEvmBalances } =
    await import("../src/web3/evm/services/evm-balance.service")
  const { getEvmAllowances } =
    await import("../src/web3/evm/services/evm-allowance.service")

  const onlyChainId = parseChainIdArg(process.argv.slice(2))
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

  console.log(
    onlyChainId === null
      ? `Running smoke on all ${networks.length} networks`
      : `Running smoke on chainId ${onlyChainId}`,
  )

  const rows: Row[] = []
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

      const TIMEOUT = 45_000

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

        console.log(
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

      // Partial failure là failure: multicall dùng allowFailure nên một token
      // đọc lỗi vẫn trả về bình thường — smoke phải báo đỏ thay vì exit 0.
      const balanceFailures: string[] = []

      for (const result of balances.tokens) {
        balanceChecks += 1
        if (result.status === "success") {
          if (typeof result.balance.rawAmount !== "bigint") {
            throw new Error(`Balance for ${result.tokenAddress} is not bigint`)
          }
          console.log(
            `  ✅ balance(${result.tokenAddress}): ${result.balance.formattedAmount} ${result.balance.symbol}`,
          )
        } else {
          console.error(
            `  ❌ balance(${result.tokenAddress}) FAILED: ${result.error.message}`,
          )
          balanceFailures.push(
            `${result.tokenAddress}: ${result.error.message}`,
          )
        }
      }

      if (balanceFailures.length > 0) {
        throw new Error(
          `getEvmBalances có ${balanceFailures.length} token đọc lỗi — ${balanceFailures.join("; ")}`,
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
          console.log(
            `  ✅ allowance(${result.request.tokenAddress}): ${result.allowance}`,
          )
        } else {
          console.error(
            `  ❌ allowance(${result.request.tokenAddress}) FAILED: ${result.error.message}`,
          )
          allowanceFailures.push(
            `${result.request.tokenAddress}: ${result.error.message}`,
          )
        }
      }

      if (allowanceFailures.length > 0) {
        throw new Error(
          `getEvmAllowances có ${allowanceFailures.length} token đọc lỗi — ${allowanceFailures.join("; ")}`,
        )
      }

      networksPassed += 1
      console.log(
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
      console.error(`❌ ${network.key}: ${message}`)
    }
  }

  console.log("")
  console.log("Summary:")
  console.log(
    `  Networks checked: ${networksChecked} (Passed: ${networksPassed}, Failed: ${networksFailed})`,
  )
  console.log(`  Tokens checked: ${tokensChecked}`)
  console.log(`  Balance checks: ${balanceChecks}`)
  console.log(`  Allowance checks: ${allowanceChecks}`)

  process.exitCode = networksFailed > 0 ? 1 : 0
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
