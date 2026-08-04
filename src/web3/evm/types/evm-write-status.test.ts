import { describe, expect, it } from "vitest"

import { createEvmWeb3Error } from "@/web3/evm/errors"
import { deriveEvmWriteStatus } from "./evm-write-status"

const TX_HASH =
  "0xcccc1111222233334444555566667777888899990000aaaabbbbccccddddeeee"

describe("deriveEvmWriteStatus", () => {
  it("return idle when not started", () => {
    expect(deriveEvmWriteStatus({})).toBe("idle")
  })

  it("return simulating while simulating contract", () => {
    expect(
      deriveEvmWriteStatus({
        hasPreparedRequest: true,
        isSimulating: true,
      }),
    ).toBe("simulating")
  })

  it("Return ready when simulation is successful (token/approval)", () => {
    expect(
      deriveEvmWriteStatus({
        hasPreparedRequest: true,
        isReadyToSubmit: true,
      }),
    ).toBe("ready")
  })

  it("Return ready to native transfer after prepare() (no simulation needed)", () => {
    expect(
      deriveEvmWriteStatus({
        hasPreparedRequest: true,
        isReadyToSubmit: true, // native: request !== null
      }),
    ).toBe("ready")
  })

  it("pay awaiting-signature when the wallet is waiting for signature", () => {
    expect(
      deriveEvmWriteStatus({
        hasPreparedRequest: true,
        isReadyToSubmit: true,
        isWriting: true,
      }),
    ).toBe("awaiting-signature")
  })

  it("Pay confirmation when you have hash and are waiting for receipt", () => {
    expect(
      deriveEvmWriteStatus({
        hash: "0x123",
      }),
    ).toBe("confirming")
  })

  it("Pay success when receipt status is success", () => {
    expect(
      deriveEvmWriteStatus({
        hash: "0x123",
        receiptStatus: "success",
      }),
    ).toBe("success")
  })

  it("Return reverted when receipt status is reverted", () => {
    expect(
      deriveEvmWriteStatus({
        hash: "0x123",
        receiptStatus: "reverted",
      }),
    ).toBe("reverted")
  })

  it("Returns reverted when there is an error code TRANSACTION_REVERTED on a transaction already on the chain", () => {
    expect(
      deriveEvmWriteStatus({
        hash: TX_HASH,
        receiptStatus: "reverted",
        error: createEvmWeb3Error("TRANSACTION_REVERTED", "Reverted"),
      }),
    ).toBe("reverted")
  })

  it("Do not consider mined revert from TRANSACTION_REVERTED when there is no receipt", () => {
    expect(
      deriveEvmWriteStatus({
        hash: null,
        receiptStatus: null,
        error: createEvmWeb3Error(
          "TRANSACTION_REVERTED",
          "Transaction reverted.",
        ),
      }),
    ).toBe("error")
  })

  it("Do not deduce reverted from error code even if hash is available", () => {
    expect(
      deriveEvmWriteStatus({
        hash: TX_HASH,
        receiptStatus: null,
        error: createEvmWeb3Error(
          "TRANSACTION_REVERTED",
          "Transaction execution result is unavailable.",
        ),
      }),
    ).toBe("error")
  })

  it("receipt success is the source of authenticity, overcoming the remaining error object", () => {
    expect(
      deriveEvmWriteStatus({
        hash: TX_HASH,
        receiptStatus: "success",
        error: createEvmWeb3Error("RPC_REQUEST_FAILED", "Stale RPC error"),
      }),
    ).toBe("success")
  })

  it("The reverted receipt is the source of authenticity, overcoming the remaining error object", () => {
    expect(
      deriveEvmWriteStatus({
        hash: TX_HASH,
        receiptStatus: "reverted",
        error: createEvmWeb3Error("RPC_REQUEST_FAILED", "Receipt query error"),
      }),
    ).toBe("reverted")
  })

  it("returns error rather than reverted when SIMULATION_REVERTED (no transaction yet)", () => {
    expect(
      deriveEvmWriteStatus({
        hasPreparedRequest: true,
        isReadyToSubmit: false,
        isWriting: false,
        hash: null,
        receiptStatus: null,
        error: createEvmWeb3Error(
          "SIMULATION_REVERTED",
          "Contract simulation reverted.",
        ),
      }),
    ).toBe("error")
  })

  it.each([
    ["SIMULATION_REVERTED", null, null, "error"],
    ["TRANSACTION_REVERTED", TX_HASH, null, "error"],
    ["TRANSACTION_REVERTED", TX_HASH, "reverted", "reverted"],
  ] as const)(
    "Distinguish lifecycle by error code %s",
    (code, hash, receiptStatus, expected) => {
      expect(
        deriveEvmWriteStatus({
          hash,
          receiptStatus,
          error: createEvmWeb3Error(code, "Reverted"),
        }),
      ).toBe(expected)
    },
  )

  it("Return rejected when error is TRANSACTION_REJECTED", () => {
    expect(
      deriveEvmWriteStatus({
        error: createEvmWeb3Error("TRANSACTION_REJECTED", "User rejected"),
      }),
    ).toBe("rejected")
  })

  it("Return error when there is another generic error", () => {
    expect(
      deriveEvmWriteStatus({
        error: createEvmWeb3Error("SIMULATION_FAILED", "Simulation error"),
      }),
    ).toBe("error")

    expect(
      deriveEvmWriteStatus({
        error: createEvmWeb3Error("TRANSACTION_FAILED", "Submission error"),
      }),
    ).toBe("error")

    expect(
      deriveEvmWriteStatus({
        error: createEvmWeb3Error("RPC_REQUEST_FAILED", "RPC error"),
      }),
    ).toBe("error")
  })
})
