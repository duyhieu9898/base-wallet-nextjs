import { maxUint256, type Address } from "viem"
import { describe, expect, it } from "vitest"

import {
  getEvmMainnets,
  getEvmTestnets,
} from "@/web3/evm/adapters/evm-registry.adapter"
import {
  buildNativeTransferReview,
  buildTokenApprovalReview,
  buildTokenTransferReview,
} from "@/web3/evm/adapters/evm-transaction-review.adapter"
import { EvmWeb3Error } from "@/web3/evm/errors"
import type { EvmSelection } from "@/web3/evm/selection/evm-selection"

const testnet = getEvmTestnets()[0]!
const mainnet = getEvmMainnets()[0]!

const ACCOUNT: Address = "0x086d9feCB2F117369fAbDB884eC6851b36595444"
const RECIPIENT: Address = "0x2222222222222222222222222222222222222222"
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

const readyMainnetSelection: EvmSelection = {
  status: "ready",
  account: ACCOUNT,
  walletChainId: mainnet.chain.id,
  chainId: mainnet.chain.id,
  network: mainnet,
  networks: [testnet, mainnet],
}

const disconnectedSelection: EvmSelection = {
  status: "disconnected",
  account: null,
  walletChainId: null,
  chainId: testnet.chain.id,
  network: testnet,
  networks: [testnet, mainnet],
}

const unsupportedSelection: EvmSelection = {
  status: "unsupported",
  account: ACCOUNT,
  walletChainId: 999999,
  chainId: null,
  network: null,
  networks: [testnet, mainnet],
}

describe("evm-transaction-review.adapter", () => {
  describe("buildNativeTransferReview", () => {
    it("Create native transfer review with correct parameters", () => {
      const review = buildNativeTransferReview({
        selection: readySepoliaSelection,
        prepared: { to: RECIPIENT, value: 1_000_000_000_000_000n },
      })

      expect(review).toEqual({
        action: "native-transfer",
        chainId: testnet.chain.id,
        account: ACCOUNT,
        recipient: RECIPIENT,
        amount: "0.001",
        rawAmount: 1_000_000_000_000_000n,
        assetSymbol: "ETH",
        networkName: "Sepolia",
        isMainnet: false,
      })
    })

    it("Determine the correct mainnet flag when on the Ethereum Mainnet", () => {
      const review = buildNativeTransferReview({
        selection: readyMainnetSelection,
        prepared: { to: RECIPIENT, value: 100_000_000_000_000_000n },
      })

      expect(review.isMainnet).toBe(true)
      expect(review.networkName).toBe("Ethereum")
    })

    it("throws SELECTION_NOT_READY when selection disconnected", () => {
      expect(() =>
        buildNativeTransferReview({
          selection: disconnectedSelection,
          prepared: { to: RECIPIENT, value: 1000n },
        }),
      ).toThrowError(EvmWeb3Error)
    })

    it("throws UNSUPPORTED_CHAIN ​​when selection unsupported", () => {
      expect(() =>
        buildNativeTransferReview({
          selection: unsupportedSelection,
          prepared: { to: RECIPIENT, value: 1000n },
        }),
      ).toThrowError(EvmWeb3Error)
    })
  })

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
})
