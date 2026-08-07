import { maxUint256, type Address } from "viem"
import { describe, expect, it } from "vitest"

import {
  getEvmMainnets,
  getEvmTestnets,
} from "../../chain/registry/evm-registry.adapter"
import { buildTokenApprovalReview } from "./review"
import type { EvmSelection } from "../../chain/selection/evm-selection"

const testnet = getEvmTestnets()[0]!
const mainnet = getEvmMainnets()[0]!

const ACCOUNT: Address = "0x086d9feCB2F117369fAbDB884eC6851b36595444"
const SPENDER: Address = "0x3333333333333333333333333333333333333333"

const USDC_SEPOLIA: Address = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"

const readySepoliaSelection: EvmSelection = {
  status: "ready",
  account: ACCOUNT,
  walletChainId: testnet.chain.id,
  chainId: testnet.chain.id,
  network: testnet,
  networks: [testnet, mainnet],
}

describe("buildTokenApprovalReview", () => {
  it("correctly determine unlimited approval when rawAmount === maxUint256", () => {
    const review = buildTokenApprovalReview({
      selection: readySepoliaSelection,
      prepared: {
        address: USDC_SEPOLIA,
        abi: [] as unknown as never,
        functionName: "approve",
        args: [SPENDER, maxUint256],
      },
    })

    expect(review.action).toBe("token-approval")
    expect(
      (review as Extract<typeof review, { action: "token-approval" }>)
        .isUnlimitedApproval,
    ).toBe(true)
    expect(review.rawAmount).toBe(maxUint256)
  })

  it("define isUnlimitedApproval = false for the regular amount", () => {
    const review = buildTokenApprovalReview({
      selection: readySepoliaSelection,
      prepared: {
        address: USDC_SEPOLIA,
        abi: [] as unknown as never,
        functionName: "approve",
        args: [SPENDER, 100_000_000n],
      },
    })

    expect(
      (review as Extract<typeof review, { action: "token-approval" }>)
        .isUnlimitedApproval,
    ).toBe(false)
  })
})
