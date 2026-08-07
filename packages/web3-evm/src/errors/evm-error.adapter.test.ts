import {
  BaseError,
  ChainMismatchError,
  ContractFunctionRevertedError,
  InsufficientFundsError,
  UserRejectedRequestError,
} from "viem"
import { describe, expect, it } from "vitest"

import { standardErc20Abi } from "../abi/erc20"
import { toEvmWeb3Error, toEvmWeb3ErrorOrNull } from "./evm-error.adapter"
import { createEvmWeb3Error, EvmWeb3Error } from "./evm-errors"

describe("toEvmWeb3Error", () => {
  it("map user rejection to TRANSACTION_REJECTED at any phase and discard the viem's ​​raw message", () => {
    const rejection = new UserRejectedRequestError(
      new Error("MetaMask Tx Signature: User denied transaction signature."),
    )
    const wrapped = new BaseError("Failed to send transaction.", {
      cause: rejection,
    })

    const result = toEvmWeb3Error(wrapped, { phase: "submission" })

    expect(result).toBeInstanceOf(EvmWeb3Error)
    expect(result.code).toBe("TRANSACTION_REJECTED")
    expect(result.message).toBe("Transaction was rejected in wallet.")
    expect(result.message).not.toMatch(/viem@|Details:|Version:/)
    expect(result.cause).toBe(wrapped)
  })

  it("Map contract reverts in simulation phase to SIMULATION_REVERTED with reason", () => {
    const reverted = new ContractFunctionRevertedError({
      abi: standardErc20Abi,
      functionName: "transfer",
      message: "execution reverted: ERC20: transfer amount exceeds balance",
    })
    reverted.reason = "ERC20: transfer amount exceeds balance"
    const wrapped = new BaseError("Contract call failed", { cause: reverted })

    const result = toEvmWeb3Error(wrapped, { phase: "simulation" })

    expect(result).toBeInstanceOf(EvmWeb3Error)
    expect(result.code).toBe("SIMULATION_REVERTED")
    expect(result.message).toContain("ERC20: transfer amount exceeds balance")
    expect(result.message).not.toMatch(/viem@|Details:|Version:/)
    expect(result.cause).toBe(wrapped)
  })

  it("Found nested ContractFunctionRevertedError through many BaseError classes of wagmi/viem", () => {
    const reverted = new ContractFunctionRevertedError({
      abi: standardErc20Abi,
      functionName: "transfer",
    })
    reverted.data = {
      abiItem: { type: "error", name: "InsufficientAllowance", inputs: [] },
      errorName: "InsufficientAllowance",
      args: [],
    }

    const nested = new BaseError("Simulation failed", {
      cause: new BaseError("Contract call failed", { cause: reverted }),
    })

    const result = toEvmWeb3Error(nested, { phase: "simulation" })

    expect(result.code).toBe("SIMULATION_REVERTED")
    expect(result.message).toContain("InsufficientAllowance")
  })

  it("Use a separate fallback message for simulation revert when the contract does not return a reason", () => {
    const reverted = new ContractFunctionRevertedError({
      abi: standardErc20Abi,
      functionName: "transfer",
    })

    const result = toEvmWeb3Error(reverted, { phase: "simulation" })

    expect(result.code).toBe("SIMULATION_REVERTED")
    expect(result.message).toBe("Contract simulation reverted.")
  })

  it("Map contract reverts in receipt phase to TRANSACTION_REVERTED", () => {
    const reverted = new ContractFunctionRevertedError({
      abi: standardErc20Abi,
      functionName: "approve",
    })

    const result = toEvmWeb3Error(reverted, { phase: "receipt" })

    expect(result.code).toBe("TRANSACTION_REVERTED")
    expect(result.message).toBe("Transaction reverted by contract.")
  })

  it("map contract execution error in submission phase to TRANSACTION_FAILED, keep revert reason", () => {
    const reverted = new ContractFunctionRevertedError({
      abi: standardErc20Abi,
      functionName: "transfer",
    })
    reverted.reason = "ERC20: transfer amount exceeds balance"
    const wrapped = new BaseError("Failed to execute transaction.", {
      cause: reverted,
    })

    const result = toEvmWeb3Error(wrapped, { phase: "submission" })

    expect(result.code).toBe("TRANSACTION_FAILED")
    expect(result.message).toContain("Transaction submission failed")
    expect(result.message).toContain("ERC20: transfer amount exceeds balance")
    expect(result.cause).toBe(wrapped)
  })

  it("submission fallback message does not confirm that the transaction has been mined", () => {
    const reverted = new ContractFunctionRevertedError({
      abi: standardErc20Abi,
      functionName: "transfer",
    })

    const result = toEvmWeb3Error(reverted, { phase: "submission" })

    expect(result.code).toBe("TRANSACTION_FAILED")
    expect(result.message).toBe(
      "Transaction submission failed because the contract call reverted.",
    )
    expect(result.message).not.toContain("Transaction reverted by contract")
  })

  it("simulation error not contract revert is still SIMULATION_FAILED", () => {
    const result = toEvmWeb3Error(new Error("Invalid RPC response"), {
      phase: "simulation",
    })

    expect(result.code).toBe("SIMULATION_FAILED")
    expect(result.message).toBe("Invalid RPC response")
  })

  it("generic simulation error map to SIMULATION_FAILED", () => {
    const error = new BaseError("Execution reverted for an unknown reason.", {
      details: "some very long rpc payload",
    })

    const result = toEvmWeb3Error(error, { phase: "simulation" })

    expect(result.code).toBe("SIMULATION_FAILED")
    expect(result.message).toBe("Execution reverted for an unknown reason.")
    expect(result.message).not.toContain("some very long rpc payload")
    expect(result.cause).toBe(error)
  })

  it("generic submission error map to TRANSACTION_FAILED", () => {
    const error = new BaseError("Failed to submit transaction to node.", {
      details: "nonce too low",
    })

    const result = toEvmWeb3Error(error, { phase: "submission" })

    expect(result.code).toBe("TRANSACTION_FAILED")
    expect(result.message).toBe("Failed to submit transaction to node.")
    expect(result.message).not.toContain("nonce too low")
    expect(result.cause).toBe(error)
  })

  it("generic receipt/RPC error map to RPC_REQUEST_FAILED", () => {
    const error = new BaseError(
      "RPC connection lost while waiting for receipt.",
      {
        details: "HTTP 503",
      },
    )

    const result = toEvmWeb3Error(error, { phase: "receipt" })

    expect(result.code).toBe("RPC_REQUEST_FAILED")
    expect(result.message).toBe(
      "RPC connection lost while waiting for receipt.",
    )
    expect(result.cause).toBe(error)
  })

  it("Keep the existing EvmWeb3Error code intact, don't wrap it again", () => {
    const original = createEvmWeb3Error("INVALID_AMOUNT", "Invalid amount.")

    expect(toEvmWeb3Error(original, { phase: "submission" })).toBe(original)
  })

  it("Can handle normal Errors and non-Error values", () => {
    expect(
      toEvmWeb3Error(new Error("boom"), { phase: "submission" }).code,
    ).toBe("TRANSACTION_FAILED")
    expect(toEvmWeb3Error("boom", { phase: "receipt" }).code).toBe(
      "RPC_REQUEST_FAILED",
    )
    expect(toEvmWeb3Error(undefined)).toBeInstanceOf(EvmWeb3Error)
  })

  it("clean multi-line generic Error message, get only the first line", () => {
    const error = new Error(
      "Generic connector failed\nDetails: raw payload\nTrace: stack trace...",
    )
    const result = toEvmWeb3Error(error, { phase: "submission" })

    expect(result.code).toBe("TRANSACTION_FAILED")
    expect(result.message).toBe("Generic connector failed")
    expect(result.message).not.toContain("Details:")
    expect(result.cause).toBe(error)
  })

  it("map InsufficientFundsError to INSUFFICIENT_FUNDS", () => {
    const insufficient = new InsufficientFundsError()
    const wrapped = new BaseError("Failed to execute transaction.", {
      cause: insufficient,
    })
    const result = toEvmWeb3Error(wrapped, { phase: "submission" })

    expect(result.code).toBe("INSUFFICIENT_FUNDS")
    expect(result.cause).toBe(wrapped)
  })

  it("map ChainMismatchError to CHAIN_MISMATCH", () => {
    const mismatch = new ChainMismatchError({
      chain: {
        id: 1,
        name: "Ethereum",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: { default: { http: ["https://rpc.ankr.com/eth"] } },
      },
      currentChainId: 11155111,
    })
    const wrapped = new BaseError("Chain mismatch.", { cause: mismatch })
    const result = toEvmWeb3Error(wrapped, { phase: "submission" })

    expect(result.code).toBe("CHAIN_MISMATCH")
    expect(result.cause).toBe(wrapped)
  })

  it("map nonce too low shortMessage to NONCE_TOO_LOW", () => {
    const error = new BaseError("nonce too low")
    const result = toEvmWeb3Error(error, { phase: "submission" })

    expect(result.code).toBe("NONCE_TOO_LOW")
  })

  it("map replacement transaction underpriced to NONCE_TOO_LOW", () => {
    const error = new BaseError("replacement transaction underpriced")
    const result = toEvmWeb3Error(error, { phase: "submission" })

    expect(result.code).toBe("NONCE_TOO_LOW")
  })

  it("Order of priority: rejected > reverted > insufficient > chain mismatch > nonce > generic", () => {
    // rejection wins over everything
    const rejection = new UserRejectedRequestError(new Error("Denied."))
    const withInsufficient = new BaseError("fail", {
      cause: new InsufficientFundsError(),
    })
    expect(
      toEvmWeb3Error(new BaseError("outer", { cause: rejection }), {
        phase: "submission",
      }).code,
    ).toBe("TRANSACTION_REJECTED")

    // insufficient > generic
    expect(toEvmWeb3Error(withInsufficient, { phase: "submission" }).code).toBe(
      "INSUFFICIENT_FUNDS",
    )
  })
})

describe("toEvmWeb3ErrorOrNull", () => {
  it("returns null when there is no error", () => {
    expect(toEvmWeb3ErrorOrNull(null)).toBeNull()
    expect(toEvmWeb3ErrorOrNull(undefined)).toBeNull()
  })

  it("The map is normal when there is an error with the phase", () => {
    const error = toEvmWeb3ErrorOrNull(new Error("boom"), {
      phase: "submission",
    })
    expect(error).toBeInstanceOf(EvmWeb3Error)
    expect(error?.code).toBe("TRANSACTION_FAILED")
  })
})
