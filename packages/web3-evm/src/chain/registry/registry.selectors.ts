import type { ExplorerConfig } from "./registry.types"

/**
 * Create explorer configuration with URL builder following common convention:
 * `{base}/address/{address}` and `{base}/tx/{hash}` (Etherscan/Basescan/Arbiscan/Polygonscan).
 */
export function createExplorerConfig(
  name: string,
  url: string,
): ExplorerConfig {
  const base = url.replace(/\/+$/, "")

  return {
    name,
    url: base,
    addressUrl: (address) => `${base}/address/${address}`,
    transactionUrl: (hash) => `${base}/tx/${hash}`,
  }
}
