import type { Address } from "viem"

export type EvmTransactionReview =
  | {
      action: "native-transfer"
      chainId: number
      account: Address
      recipient: Address
      amount: string
      rawAmount: bigint
      assetSymbol: string
      networkName: string
      isMainnet: boolean
    }
  | {
      action: "token-transfer"
      chainId: number
      account: Address
      tokenAddress: Address
      recipient: Address
      amount: string
      rawAmount: bigint
      assetSymbol: string
      networkName: string
      isMainnet: boolean
    }
  | {
      action: "token-approval"
      chainId: number
      account: Address
      tokenAddress: Address
      spender: Address
      amount: string
      rawAmount: bigint
      assetSymbol: string
      networkName: string
      isMainnet: boolean
      isUnlimitedApproval: boolean
    }
