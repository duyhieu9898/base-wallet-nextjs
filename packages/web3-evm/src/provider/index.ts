/**
 * Public subpath for mounting the EVM runtime (`@nln/web3-evm/provider`).
 *
 * `EvmProvider` is deliberately outside the main barrel: importing a hook must
 * not pull a Wagmi client into the module graph. It still needs a public path,
 * because the application's composition root is the only thing allowed to decide
 * which runtimes are mounted and in what order.
 */

export { EvmProvider } from "./evm-provider"
export {
  createWagmiConfig,
  createEvmConnectors,
  toNonEmptyChainTuple,
  type EvmProviderOptions,
} from "./wagmi-config.adapter"
