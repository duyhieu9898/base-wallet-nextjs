import { describe, expect, it } from "vitest"

import { compileStakingVault } from "../tooling/compiler"

describe("TestStakingVault compiler", () => {
  it("emits bytecode and the expected minimal staking interface", () => {
    const artifact = compileStakingVault()
    const functions = artifact.abi
      .filter((item) => item.type === "function")
      .map((item) => item.name)

    expect(artifact.bytecode).toMatch(/^0x[\da-f]+$/i)
    expect(functions).toEqual(
      expect.arrayContaining([
        "stakeNative",
        "stakeUsdc",
        "unstakeNative",
        "unstakeUsdc",
      ]),
    )
  })
})
