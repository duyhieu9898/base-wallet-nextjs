/**
 * Solana error taxonomy — public leaf entrypoint (`@nln/web3-solana/errors`).
 *
 * React-free and adapter-free. Import from here when the consumer is pure logic
 * that must not pull the runtime into its module graph; the main barrel
 * re-exports the same symbols for React code.
 */
export {
  createSolanaWeb3Error,
  SolanaWeb3Error,
  type SolanaErrorCode,
} from "./solana-errors"
