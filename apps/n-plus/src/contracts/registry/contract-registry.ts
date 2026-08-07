import { type Abi } from "viem"
import {
  type BaseContractDeployment,
  readDeploymentParameters,
  validateDeploymentAddress,
} from "@nln/web3-evm/contracts"

import testStakingVaultAbiJson from "../../../contracts/artifacts/TestStakingVault.abi.json"
import deploymentsJson from "./deployments.json"
import { evmNetworks } from "@/config/web3.config"

export type ContractKey = "staking-vault"
export type ContractAbiKey = "TestStakingVault"

export type ContractDeployment = BaseContractDeployment<
  ContractKey,
  ContractAbiKey
>

type RawDeployment = {
  address?: unknown
  abi?: unknown
  version?: unknown
  parameters?: unknown
}

const ABI_BY_KEY: Readonly<Record<ContractAbiKey, Abi>> = {
  TestStakingVault: testStakingVaultAbiJson as Abi,
}

function isContractKey(value: string): value is ContractKey {
  return value === "staking-vault"
}

/** Validate the application-owned JSON registry at its import boundary. */
export function hydrateContractRegistry(
  raw: unknown = {},
): Readonly<
  Record<number, Readonly<Partial<Record<ContractKey, ContractDeployment>>>>
> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error(
      "Contract deployment registry must be an object keyed by chain ID.",
    )
  }

  const hydrated: Record<
    number,
    Readonly<Partial<Record<ContractKey, ContractDeployment>>>
  > = {}
  const config = raw as Record<string, unknown>

  const supportedChainIds = new Set(
    evmNetworks.map((network) => network.chain.id),
  )

  for (const chainId of supportedChainIds) {
    if (!Object.hasOwn(config, chainId)) {
      throw new Error(
        `Contract deployment config is missing supported chain ${chainId}. Use an empty object when no contract is deployed.`,
      )
    }
  }

  for (const [rawChainId, rawChainDeployments] of Object.entries(config)) {
    const chainId = Number(rawChainId)
    if (!Number.isSafeInteger(chainId) || !supportedChainIds.has(chainId)) {
      throw new Error(`Unsupported contract deployment chain "${rawChainId}".`)
    }
    if (
      typeof rawChainDeployments !== "object" ||
      rawChainDeployments === null ||
      Array.isArray(rawChainDeployments)
    ) {
      throw new Error(
        `Contract deployments for chain ${chainId} must be an object.`,
      )
    }

    const chainDeployments: Partial<Record<ContractKey, ContractDeployment>> =
      {}
    for (const [rawKey, rawDeployment] of Object.entries(rawChainDeployments)) {
      if (!isContractKey(rawKey)) {
        throw new Error(`Unknown contract key "${rawKey}" on chain ${chainId}.`)
      }
      if (
        typeof rawDeployment !== "object" ||
        rawDeployment === null ||
        Array.isArray(rawDeployment)
      ) {
        throw new Error(`Invalid ${rawKey} deployment on chain ${chainId}.`)
      }

      const candidate = rawDeployment as RawDeployment
      if (candidate.abi !== "TestStakingVault") {
        throw new Error(`Invalid ABI key for ${rawKey} on chain ${chainId}.`)
      }
      if (
        typeof candidate.version !== "string" ||
        candidate.version.trim() === ""
      ) {
        throw new Error(`Invalid ${rawKey} version on chain ${chainId}.`)
      }

      chainDeployments[rawKey] = {
        key: rawKey,
        chainId,
        address: validateDeploymentAddress(candidate.address, rawKey),
        abiKey: candidate.abi,
        abi: ABI_BY_KEY[candidate.abi],
        version: candidate.version,
        parameters: readDeploymentParameters(candidate.parameters, rawKey),
      }
    }
    hydrated[chainId] = Object.freeze(chainDeployments)
  }

  return Object.freeze(hydrated)
}

export const CONTRACT_DEPLOYMENTS = hydrateContractRegistry(deploymentsJson)

export function findContractDeployment(
  chainId: number,
  key: ContractKey,
): ContractDeployment | null {
  return CONTRACT_DEPLOYMENTS[chainId]?.[key] ?? null
}
