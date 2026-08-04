import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import solc from "solc"
import type { Abi, Hex } from "viem"

const CONTRACT_SOURCE_PATH = resolve(
  process.cwd(),
  "contracts/src/TestStakingVault.sol",
)

type SolidityCompilerOutput = {
  contracts?: Record<
    string,
    Record<
      string,
      {
        abi: Abi
        evm: { bytecode: { object: string } }
      }
    >
  >
  errors?: readonly {
    formattedMessage: string
    severity: "error" | "warning"
  }[]
}

export type StakingVaultArtifact = Readonly<{
  abi: Abi
  bytecode: Hex
}>

export function compileStakingVault(): StakingVaultArtifact {
  const source = readFileSync(CONTRACT_SOURCE_PATH, "utf8")
  const output = JSON.parse(
    solc.compile(
      JSON.stringify({
        language: "Solidity",
        sources: { "TestStakingVault.sol": { content: source } },
        settings: {
          optimizer: { enabled: true, runs: 200 },
          outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
        },
      }),
    ),
  ) as SolidityCompilerOutput

  const errors = output.errors?.filter((error) => error.severity === "error")
  if (errors?.length) {
    throw new Error(errors.map((error) => error.formattedMessage).join("\n"))
  }

  const contract = output.contracts?.["TestStakingVault.sol"]?.TestStakingVault
  const bytecode = contract?.evm.bytecode.object

  if (!contract || !bytecode) {
    throw new Error("Solidity compiler did not emit TestStakingVault bytecode")
  }

  return { abi: contract.abi, bytecode: `0x${bytecode}` }
}
