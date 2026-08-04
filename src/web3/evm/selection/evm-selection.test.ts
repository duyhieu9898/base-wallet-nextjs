import { describe, expect, it } from "vitest"

import { resolveEvmSelection } from "@/web3/evm/selection/evm-selection"
import {
  getAllEvmNetworks,
  getDefaultEvmNetwork,
} from "@/web3/evm/adapters/evm-registry.adapter"

const defaultNet = getDefaultEvmNetwork()
const availableNets = getAllEvmNetworks()
const ALICE: `0x${string}` = "0x086d9feCB2F117369fAbDB884eC6851b36595444"

describe("resolveEvmSelection", () => {
  it("resolves to disconnected status when wallet is not connected", () => {
    const selection = resolveEvmSelection({
      connected: false,
      defaultNetwork: defaultNet,
      availableNetworks: availableNets,
    })

    expect(selection.status).toBe("disconnected")
    expect(selection.account).toBeNull()
    expect(selection.walletChainId).toBeNull()
    expect(selection.chainId).toBe(defaultNet.chain.id)
    expect(selection.network).toEqual(defaultNet)
  })

  it("resolves to ready status when wallet is connected to a supported chain", () => {
    const selection = resolveEvmSelection({
      connected: true,
      address: ALICE,
      chainId: 11155111,
      defaultNetwork: defaultNet,
      availableNetworks: availableNets,
    })

    expect(selection.status).toBe("ready")
    expect(selection.account).toBe(ALICE)
    expect(selection.walletChainId).toBe(11155111)
    expect(selection.chainId).toBe(11155111)
    if (selection.status === "ready") {
      expect(selection.network.key).toBe("ethereum-sepolia")
    }
  })

  it("resolves to unsupported status when connected to an unknown chain", () => {
    const selection = resolveEvmSelection({
      connected: true,
      address: ALICE,
      chainId: 999999,
      defaultNetwork: defaultNet,
      availableNetworks: availableNets,
    })

    expect(selection.status).toBe("unsupported")
    expect(selection.account).toBe(ALICE)
    expect(selection.walletChainId).toBe(999999)
    expect(selection.chainId).toBeNull()
    expect(selection.network).toBeNull()
  })

  it("resolves to connecting status when connected but chainId is missing", () => {
    const selection = resolveEvmSelection({
      connected: true,
      address: ALICE,
      // chainId omitted
      defaultNetwork: defaultNet,
      availableNetworks: availableNets,
    })

    expect(selection.status).toBe("connecting")
    expect(selection.account).toBe(ALICE)
    expect(selection.walletChainId).toBeNull()
    expect(selection.chainId).toBeNull()
    expect(selection.network).toBeNull()
  })

  it("does not fallback to default network when connected but chainId is missing", () => {
    const selection = resolveEvmSelection({
      connected: true,
      address: ALICE,
      // no chainId
      defaultNetwork: defaultNet,
      availableNetworks: availableNets,
    })

    // Should NOT have default chain
    expect(selection.status).not.toBe("ready")
    expect(selection.status).not.toBe("disconnected")
    expect(selection.chainId).toBeNull()
    expect(selection.network).toBeNull()
  })

  it("updates account when address changes", () => {
    const BOB: `0x${string}` = "0x1111111111111111111111111111111111111111"
    const selection = resolveEvmSelection({
      connected: true,
      address: BOB,
      chainId: 11155111,
      defaultNetwork: defaultNet,
      availableNetworks: availableNets,
    })

    expect(selection.account).toBe(BOB)
  })
})
