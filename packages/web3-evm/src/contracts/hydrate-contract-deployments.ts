import { isAddress, type Address } from "viem"

export function readDeploymentParameters(
  raw: unknown,
  label: string,
): Readonly<Record<string, string>> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error(`Invalid parameters for ${label}.`)
  }

  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== "string") {
      throw new Error(`Invalid parameter "${key}" for ${label}.`)
    }
  }

  return Object.freeze({ ...(raw as Record<string, string>) })
}

export function validateDeploymentAddress(
  address: unknown,
  label: string,
): Address {
  if (typeof address !== "string" || !isAddress(address)) {
    throw new Error(`Invalid ${label} address.`)
  }
  return address
}
