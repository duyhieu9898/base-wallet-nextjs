import "@testing-library/jest-dom/vitest"
import { mainnet, sepolia } from "viem/chains"
import { afterEach } from "vitest"

import { configureEvmRuntime, hydrateTokens } from "../src/config"

const testTokensMap = {
  "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238": {
    type: "erc20",
    name: "USD Coin",
    symbol: "USDC",
    expectedDecimals: 6,
    enabled: true,
  },
  "0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4": {
    type: "erc20",
    name: "Euro Coin",
    symbol: "EURC",
    expectedDecimals: 6,
    enabled: true,
  },
}

configureEvmRuntime({
  defaultChainId: sepolia.id,
  networks: [
    {
      key: "ethereum-sepolia",
      family: "evm",
      chain: sepolia,
      rpcUrlOverride: "https://rpc.sepolia.org",
      tokens: hydrateTokens(testTokensMap),
      faucets: [],
    },
    {
      key: "ethereum-mainnet",
      family: "evm",
      chain: mainnet,
      rpcUrlOverride: undefined,
      tokens: {},
      faucets: [],
    },
  ],
})

afterEach(() => {
  // Pure package cleanup
})
