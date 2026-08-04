import { describe, expect, it } from "vitest"

import {
  CONTRACT_DEPLOYMENTS,
  findContractDeployment,
  hydrateContractRegistry,
} from "./contract-registry"

describe("application contract registry", () => {
  it("resolves the Sepolia staking vault by chain and contract key", () => {
    expect(findContractDeployment(11155111, "staking-vault")).toMatchObject({
      address: "0xb786c18d2feb8ea7ee9d3a295203d7b1420abe43",
      abiKey: "TestStakingVault",
      version: "test-v1",
    })
  })

  it("keeps an explicitly empty Mainnet deployment map", () => {
    expect(CONTRACT_DEPLOYMENTS[1]).toEqual({})
    expect(findContractDeployment(1, "staking-vault")).toBeNull()
  })

  it("rejects an invalid contract address at the JSON boundary", () => {
    expect(() =>
      hydrateContractRegistry({
        1: {},
        11155111: {
          "staking-vault": {
            address: "invalid",
            abi: "TestStakingVault",
            version: "test-v1",
            parameters: {
              usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
            },
          },
        },
      }),
    ).toThrow("Invalid staking-vault address")
  })
})
