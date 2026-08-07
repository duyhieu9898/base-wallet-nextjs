import { describe, expect, it } from "vitest"

import type { SolanaClusterConfig } from "../registry/solana-registry.types"
import { resolveSolanaSelection } from "./solana-selection"

const devnet: SolanaClusterConfig = {
  key: "devnet",
  family: "solana",
  name: "Solana Devnet",
  rpcUrl: "https://api.devnet.solana.com",
  explorer: {
    name: "Solana Explorer",
    url: "https://explorer.solana.com",
    addressUrl: (address) => `https://explorer.solana.com/address/${address}`,
    transactionUrl: (signature) =>
      `https://explorer.solana.com/tx/${signature}`,
  },
  tokens: {},
  faucets: [],
}

const ACCOUNT = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"

function resolve(input: {
  connected: boolean
  connecting: boolean
  account?: string | null
}) {
  return resolveSolanaSelection({
    ...input,
    activeCluster: devnet,
    availableClusters: [devnet],
  })
}

describe("resolveSolanaSelection", () => {
  it("is ready when connected with an account", () => {
    const selection = resolve({
      connected: true,
      connecting: false,
      account: ACCOUNT,
    })

    expect(selection.status).toBe("ready")
    expect(selection.account).toBe(ACCOUNT)
  })

  it("is connecting while the wallet prompt is open", () => {
    expect(resolve({ connected: false, connecting: true }).status).toBe(
      "connecting",
    )
  })

  it("is connecting when the adapter reports connected but exposes no key yet", () => {
    // This window is real: `connected` flips before `publicKey` is populated.
    // Treating it as ready would hand `null` to a read as an owner address.
    expect(
      resolve({ connected: true, connecting: false, account: null }).status,
    ).toBe("connecting")
  })

  it("is disconnected otherwise", () => {
    expect(resolve({ connected: false, connecting: false }).status).toBe(
      "disconnected",
    )
  })

  it("carries the cluster in every state, including disconnected", () => {
    // A disconnected screen still resolves explorer links and token metadata,
    // so call sites should not need a null check.
    for (const selection of [
      resolve({ connected: false, connecting: false }),
      resolve({ connected: false, connecting: true }),
      resolve({ connected: true, connecting: false, account: ACCOUNT }),
    ]) {
      expect(selection.cluster.key).toBe("devnet")
      expect(selection.clusters).toHaveLength(1)
    }
  })
})
