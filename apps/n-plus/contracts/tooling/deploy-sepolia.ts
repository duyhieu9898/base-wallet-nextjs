import {
  createPublicClient,
  createWalletClient,
  encodeDeployData,
  formatEther,
  http,
  type Hex,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { sepolia } from "viem/chains"

import { loadEnv } from "vite"
import { compileStakingVault } from "./compiler"

const SEPOLIA_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as const
const DEPLOY_CONFIRMATION = "DEPLOY_TEST_STAKING_VAULT"

function readPrivateKey(value: string | undefined): Hex {
  const normalized = value?.startsWith("0x") ? value : `0x${value ?? ""}`

  if (!/^0x[\da-f]{64}$/i.test(normalized)) {
    throw new Error(
      "SEPOLIA_DEV_PRIVATE_KEY must be 64 hexadecimal characters, with or without a 0x prefix.",
    )
  }

  return normalized as Hex
}

async function main() {
  // Vite's loader, same precedence the app uses. The secrets this script needs
  // are deliberately unprefixed, so they stay out of any client bundle; the
  // empty prefix loads everything in the .env files into this process only.
  Object.assign(
    process.env,
    loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), ""),
  )

  if (process.env.CONFIRM_SEPOLIA_DEPLOY !== DEPLOY_CONFIRMATION) {
    throw new Error(
      `Set CONFIRM_SEPOLIA_DEPLOY=${DEPLOY_CONFIRMATION} to broadcast this deployment.`,
    )
  }

  const privateKey = readPrivateKey(process.env.SEPOLIA_DEV_PRIVATE_KEY)
  const account = privateKeyToAccount(privateKey)
  const transport = http(process.env.VITE_RPC_ETHEREUM_SEPOLIA)
  const publicClient = createPublicClient({ chain: sepolia, transport })
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport,
  })
  const artifact = compileStakingVault()
  const data = encodeDeployData({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [SEPOLIA_USDC],
  })
  const gas = await publicClient.estimateGas({ account, data })
  const fees = await publicClient.estimateFeesPerGas()
  const maxFeePerGas = fees.maxFeePerGas ?? (await publicClient.getGasPrice())
  const estimatedCost = gas * maxFeePerGas

  console.log(`Deploying TestStakingVault from ${account.address} on Sepolia`)
  console.log(`Estimated gas: ${gas.toString()}`)
  console.log(`Estimated maximum cost: ${formatEther(estimatedCost)} ETH`)

  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [SEPOLIA_USDC],
    gas,
    maxFeePerGas,
    maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
  })
  const receipt = await publicClient.waitForTransactionReceipt({ hash })

  if (receipt.status !== "success" || !receipt.contractAddress) {
    throw new Error(`Deployment failed: ${hash}`)
  }

  console.log(`Contract deployed: ${receipt.contractAddress}`)
  console.log(`Transaction: https://sepolia.etherscan.io/tx/${hash}`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
