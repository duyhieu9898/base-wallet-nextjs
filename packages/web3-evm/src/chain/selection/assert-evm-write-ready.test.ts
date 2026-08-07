import { describe, expect, it } from "vitest"

import { getDefaultEvmNetwork } from "../registry/evm-registry.adapter"
import { EvmWeb3Error } from "../../errors/evm-errors"
import { assertEvmWriteReady } from "./assert-evm-write-ready"
import type { EvmSelection } from "./evm-selection"

const defaultNetwork = getDefaultEvmNetwork()

const readySelection: EvmSelection = {
  status: "ready",
  account: "0x086d9feCB2F117369fAbDB884eC6851b36595444",
  walletChainId: 11155111,
  chainId: 11155111,
  network: defaultNetwork,
  networks: [defaultNetwork],
}

const disconnectedSelection: EvmSelection = {
  status: "disconnected",
  account: null,
  walletChainId: null,
  chainId: 11155111,
  network: defaultNetwork,
  networks: [defaultNetwork],
}

const connectingSelection: EvmSelection = {
  status: "connecting",
  account: "0x086d9feCB2F117369fAbDB884eC6851b36595444",
  walletChainId: null,
  chainId: null,
  network: null,
  networks: [defaultNetwork],
}

const unsupportedSelection: EvmSelection = {
  status: "unsupported",
  account: "0x086d9feCB2F117369fAbDB884eC6851b36595444",
  walletChainId: 999999,
  chainId: null,
  network: null,
  networks: [defaultNetwork],
}

describe("assertEvmWriteReady", () => {
  it("Do not throw when status is ready", () => {
    expect(() => assertEvmWriteReady(readySelection)).not.toThrow()
  })

  it("throw EvmWeb3Error with code UNSUPPORTED_CHAIN ​​when status is unsupported", () => {
    try {
      assertEvmWriteReady(unsupportedSelection)
      expect.fail("Expected assertion to throw")
    } catch (error) {
      expect(error).toBeInstanceOf(EvmWeb3Error)
      expect((error as EvmWeb3Error).code).toBe("UNSUPPORTED_CHAIN")
    }
  })

  it("throw EvmWeb3Error with code SELECTION_NOT_READY when status is disconnected", () => {
    try {
      assertEvmWriteReady(disconnectedSelection)
      expect.fail("Expected assertion to throw")
    } catch (error) {
      expect(error).toBeInstanceOf(EvmWeb3Error)
      expect((error as EvmWeb3Error).code).toBe("SELECTION_NOT_READY")
    }
  })

  it("throw EvmWeb3Error with code SELECTION_NOT_READY when status is connected", () => {
    try {
      assertEvmWriteReady(connectingSelection)
      expect.fail("Expected assertion to throw")
    } catch (error) {
      expect(error).toBeInstanceOf(EvmWeb3Error)
      expect((error as EvmWeb3Error).code).toBe("SELECTION_NOT_READY")
    }
  })
})
