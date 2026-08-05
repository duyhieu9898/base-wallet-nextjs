import { type Address } from "viem"
import { describe, expect, it } from "vitest"

import {
  getEvmMainnets,
  getEvmTestnets,
} from "@/web3/evm/chain/registry/evm-registry.adapter"
import { buildNativeTransferReview } from "./review"
import { EvmWeb3Error } from "@/web3/evm/errors/evm-errors"
import type { EvmSelection } from "@/web3/evm/chain/selection/evm-selection"

const testnet = getEvmTestnets()[0]!
const mainnet = getEvmMainnets()[0]!

const ACCOUNT: Address = "0x086d9feCB2F117369fAbDB884eC6851b36595444"
const RECIPIENT: Address = "0x2222222222222222222222222222222222222222"

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
