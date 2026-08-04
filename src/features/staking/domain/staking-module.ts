import type { Address } from "viem"

import type { StakingDeployment } from "../contracts/staking-deployments"

/**
 * Stable UI-facing shape for this feature. It deliberately omits reward,
 * lock, pool, and transaction details until a concrete staking contract owns
 * those semantics.
 */
export type StakingPosition = Readonly<{
  id: string
  account: Address
  assetAddress: Address
  amount: bigint
}>

export type StakingSnapshot = Readonly<{
  account: Address
  chainId: number
  positions: readonly StakingPosition[]
}>

export type StakingAction = Readonly<{
  type: "stake" | "unstake"
  account: Address
  assetAddress: Address
  amount: bigint
}>

export type StakingActionPreparation =
  | Readonly<{
      status: "unavailable"
      reason: "deployment-unconfigured"
      deployment: StakingDeployment
    }>
  | Readonly<{
      status: "unsupported"
      reason: "onchain-adapter-not-installed"
      deployment: Extract<StakingDeployment, { status: "active" }>
    }>

export interface StakingModule {
  getSnapshot(input: {
    account: Address
    chainId: number
  }): Promise<StakingSnapshot>
  prepareAction(input: {
    action: StakingAction
    chainId: number
  }): Promise<StakingActionPreparation>
}
