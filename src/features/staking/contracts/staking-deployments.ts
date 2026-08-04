import { isAddress, type Abi, type Address } from "viem"

import {
  CONTRACT_DEPLOYMENTS,
  findContractDeployment,
  type ContractDeployment,
} from "@/contracts/registry/contract-registry"

export type StakingDeployment =
  | Readonly<{ chainId: number; status: "unconfigured" }>
  | Readonly<{
      chainId: number
      status: "active"
      contractAddress: Address
      version: string
      abi: Abi
      usdcAddress: Address
    }>

function toStakingDeployment(
  deployment: ContractDeployment,
): Extract<StakingDeployment, { status: "active" }> {
  const usdcAddress = deployment.parameters.usdcAddress
  if (!usdcAddress || !isAddress(usdcAddress)) {
    throw new Error(
      `Staking vault deployment on chain ${deployment.chainId} is missing usdcAddress.`,
    )
  }

  return {
    chainId: deployment.chainId,
    status: "active",
    contractAddress: deployment.address,
    version: deployment.version,
    abi: deployment.abi,
    usdcAddress: usdcAddress as Address,
  }
}

export const STAKING_DEPLOYMENTS: readonly Extract<
  StakingDeployment,
  { status: "active" }
>[] = Object.freeze(
  Object.values(CONTRACT_DEPLOYMENTS)
    .map((deployments) => deployments["staking-vault"])
    .filter((deployment): deployment is ContractDeployment =>
      Boolean(deployment),
    )
    .map(toStakingDeployment),
)

export function findStakingDeployment(chainId: number): StakingDeployment {
  const deployment = findContractDeployment(chainId, "staking-vault")
  return deployment
    ? toStakingDeployment(deployment)
    : { chainId, status: "unconfigured" }
}
