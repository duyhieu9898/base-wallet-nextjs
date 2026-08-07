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
      /**
       * The single ERC-20 the vault accepts. The deployment parameter is still
       * named `usdcAddress` because that mirrors the contract's own `usdc()`
       * slot; nothing above this line should assume which token fills it.
       */
      tokenAddress: Address
    }>

function toStakingDeployment(
  deployment: ContractDeployment,
): Extract<StakingDeployment, { status: "active" }> {
  const tokenAddress = deployment.parameters.usdcAddress
  if (!tokenAddress || !isAddress(tokenAddress)) {
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
    tokenAddress: tokenAddress as Address,
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
