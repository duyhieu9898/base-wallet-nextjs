import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

import { compileStakingVault } from "./compiler"

const artifact = compileStakingVault()
const abiPath = resolve(
  process.cwd(),
  "contracts/artifacts/TestStakingVault.abi.json",
)

mkdirSync(dirname(abiPath), { recursive: true })
writeFileSync(abiPath, `${JSON.stringify(artifact.abi, null, 2)}\n`)

console.log(
  `TestStakingVault compiled: ${artifact.bytecode.length / 2 - 1} bytes`,
)
console.log(`ABI: ${abiPath}`)
console.log(
  `Functions: ${artifact.abi
    .filter((item) => item.type === "function")
    .map((item) => item.name)
    .join(", ")}`,
)
