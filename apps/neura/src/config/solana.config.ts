import { createSolanaRuntimeConfig } from "@nln/web3-solana/config"

import { readEnv } from "./env"

/**
 * Which clusters this application supports, and what lives on them.
 *
 * The package owns the schema and validates it; this file owns the data. No RPC
 * URL, cluster or mint address is known inside `@nln/web3-solana`.
 *
 * Devnet only for now. Mainnet is added when there is a deployed program to
 * point at — listing it early would let a build select a cluster with no
 * program on it.
 */
const DEVNET_RPC_URL =
  readEnv("VITE_SOLANA_DEVNET_RPC_URL") ?? "https://api.devnet.solana.com"

/**
 * Genesis hash of Solana devnet.
 *
 * Solana exposes no chain id, so this is the only way to verify an endpoint is
 * really serving the cluster it is labelled with — a mainnet URL pasted into the
 * devnet slot is otherwise invisible. Checked by `assertSolanaClusterIdentity`.
 */
export const DEVNET_GENESIS_HASH =
  "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG"

export const solanaRuntimeConfig = createSolanaRuntimeConfig({
  defaultCluster: "devnet",
  clusters: [
    {
      key: "devnet",
      family: "solana",
      name: "Solana Devnet",
      rpcUrl: DEVNET_RPC_URL,
      explorer: {
        name: "Solana Explorer",
        url: "https://explorer.solana.com",
        addressUrl: (address) =>
          `https://explorer.solana.com/address/${address}?cluster=devnet`,
        transactionUrl: (signature) =>
          `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
      },
      // USDC-Dev, the circle-issued devnet mint. NRA is added when its mint
      // exists; a placeholder address here would read as a real balance of zero.
      tokens: {
        "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU": {
          mint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
          name: "USD Coin (Devnet)",
          symbol: "USDC",
          expectedDecimals: 6,
          enabled: true,
        },
      },
      faucets: [
        {
          label: "Solana Devnet Faucet",
          url: "https://faucet.solana.com",
          assetType: "native",
        },
      ],
    },
  ],
})
