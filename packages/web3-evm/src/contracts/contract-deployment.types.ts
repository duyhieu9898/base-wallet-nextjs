import type { Abi, Address } from "viem"

export type BaseContractDeployment<
  K extends string = string,
  A extends string = string,
> = Readonly<{
  key: K
  chainId: number
  address: Address
  abiKey: A
  abi: Abi
  version: string
  parameters: Readonly<Record<string, string>>
}>
