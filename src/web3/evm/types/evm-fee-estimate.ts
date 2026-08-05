import type { EvmWeb3Error } from "@/web3/evm/errors/evm-errors"

export type EvmFeeEstimateStatus = "idle" | "estimating" | "success" | "error"

export type EvmFeeEstimate = {
  status: EvmFeeEstimateStatus
  gasLimit: bigint | null
  gasPrice: bigint | null
  maxFeePerGas: bigint | null
  estimatedFee: bigint | null
  formattedFee: string | null
  nativeSymbol: string | null
  error: EvmWeb3Error | null
}
