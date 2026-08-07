/**
 * EVM address and hex-identifier primitives — public leaf entrypoint.
 *
 * This is one of the few public paths outside `@nln/web3-evm`. Reason for existence:
 * this module is **React-free and wagmi-free**, so pure domain code (e.g., SIWE
 * message building, wallet binding) can use it without pulling the entire EVM runtime
 * — provider, wagmi config, and all hooks — into its module graph.
 *
 * The runtime barrel `@nln/web3-evm` also re-exports these helpers for React code.
 * Only import from here when the consumer is pure logic requiring no runtime.
 *
 */
export {
  EVM_NATIVE_TOKEN_ADDRESS,
  EVM_ZERO_ADDRESS,
  isNativeTokenAddress,
  isSameAddress,
  isValidAddress,
  isValidTransactionHash,
  isZeroAddress,
  parseChecksumAddress,
  shortenAddress,
  shortenHash,
  toAddressKey,
  toChecksumAddress,
  truncateAddress,
} from "./address.utils"
