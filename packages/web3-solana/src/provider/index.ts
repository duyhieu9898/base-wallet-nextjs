/**
 * Runtime mount point — public leaf entrypoint
 * (`@nln/web3-solana/provider`).
 *
 * Outside the main barrel on purpose: importing a read hook must not pull a
 * `Connection` and the wallet adapter into the module graph.
 */
export { SolanaProvider, type SolanaProviderProps } from "./solana-provider"
