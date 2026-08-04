import type { Address } from "viem"

import { findStakingDeployment } from "../contracts/staking-deployments"
import type {
  StakingActionPreparation,
  StakingModule,
  StakingPosition,
} from "../domain/staking-module"

export type CreateMockStakingModuleOptions = Readonly<{
  positions?: readonly StakingPosition[]
}>

/**
 * Local UI/test seam. This returns fixture data only and never creates an EVM
 * transaction; replace it with a feature-local on-chain adapter after the
 * staking contract is defined.
 */
export function createMockStakingModule(
  options: CreateMockStakingModuleOptions = {},
): StakingModule {
  const positions = options.positions ?? []

  return {
    async getSnapshot({ account, chainId }) {
      const accountKey = account.toLowerCase()

      return {
        account,
        chainId,
        positions: positions.filter(
          (position) => position.account.toLowerCase() === accountKey,
        ),
      }
    },

    async prepareAction({ chainId }): Promise<StakingActionPreparation> {
      const deployment = findStakingDeployment(chainId)

      if (deployment.status === "unconfigured") {
        return {
          status: "unavailable",
          reason: "deployment-unconfigured",
          deployment,
        }
      }

      return {
        status: "unsupported",
        reason: "onchain-adapter-not-installed",
        deployment,
      }
    },
  }
}

export const MOCK_STAKING_ACCOUNT =
  "0x1111111111111111111111111111111111111111" as Address

export const MOCK_STAKING_ASSET =
  "0x2222222222222222222222222222222222222222" as Address
