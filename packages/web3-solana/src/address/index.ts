/**
 * Solana address primitives — public leaf entrypoint
 * (`@nln/web3-solana/address`).
 *
 * React-free and adapter-free, so pure domain code can use it without pulling
 * the runtime, its provider, or any hook into the module graph. The main barrel
 * re-exports these for React code; import from here only when the consumer is
 * pure logic.
 */
export {
  isSameAddress,
  isSignableAddress,
  isValidAddress,
  isValidSignature,
  shortenAddress,
  shortenSignature,
  SYSTEM_PROGRAM_ADDRESS,
  toAddressKey,
  WRAPPED_SOL_MINT,
} from "./address.utils"
