import { type Address } from "viem"
import { describe, expect, it } from "vitest"

import {
  getEvmMainnets,
  getEvmTestnets,
} from "@/web3/evm/chain/registry/evm-registry.adapter"
import { buildTokenTransferReview } from "./review"
import { EvmWeb3Error } from "@/web3/evm/errors/evm-errors"
import type { EvmSelection } from "@/web3/evm/chain/selection/evm-selection"

const testnet = getEvmTestnets()[0]!
const mainnet = getEvmMainnets()[0]!

const ACCOUNT: Address = "0x086d9feCB2F117369fAbDB884eC6851b36595444"
const RECIPIENT: Address = "0x2222222222222222222222222222222222222222"

const USDC_SEPOLIA: Address = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"

const readySepoliaSelection: EvmSelection = {
  status: "ready",
  account: ACCOUNT,
  walletChainId: testnet.chain.id,
  chainId: testnet.chain.id,
  network: testnet,
  networks: [testnet, mainnet],
}

describe("buildTokenTransferReview", () => {
  it("Use canonical token address from registry", () => {
    const review = buildTokenTransferReview({
      selection: readySepoliaSelection,
      prepared: {
        address: USDC_SEPOLIA.toLowerCase() as Address,
        abi: [] as unknown as never,
        functionName: "transfer",
        args: [RECIPIENT, 1_500_000n],
      },
    })

    expect(review).toEqual({
      action: "token-transfer",
      chainId: testnet.chain.id,
      account: ACCOUNT,
      tokenAddress: USDC_SEPOLIA, // canonical checksummed address
      recipient: RECIPIENT,
      amount: "1.5",
      rawAmount: 1_500_000n,
      assetSymbol: "USDC",
      networkName: "Sepolia",
      isMainnet: false,
    })
  })

  it("throws TOKEN_NOT_CONFIGURED when the token is not in the registry", () => {
    const unknownToken: Address = "0x9999999999999999999999999999999999999999"
    try {
      buildTokenTransferReview({
        selection: readySepoliaSelection,
        prepared: {
          address: unknownToken,
          abi: [] as unknown as never,
          functionName: "transfer",
          args: [RECIPIENT, 100n],
        },
      })
      expect.fail("Expected buildTokenTransferReview to throw")
    } catch (error) {
      expect(error).toBeInstanceOf(EvmWeb3Error)
      expect((error as EvmWeb3Error).code).toBe("TOKEN_NOT_CONFIGURED")
    }
  })
})
