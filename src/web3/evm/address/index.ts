/**
 * EVM address primitives — public leaf entrypoint.
 *
 * Đây là một trong số ít public path ngoài `@/web3/evm`. Lý do tồn tại:
 * module này **React-free và wagmi-free**, nên pure domain code (ví dụ SIWE
 * message building, wallet binding) dùng được mà không kéo toàn bộ EVM runtime
 * — provider, wagmi config và mọi hook — vào module graph của mình.
 *
 * Runtime barrel `@/web3/evm` cũng re-export các helper này cho React code.
 * Chỉ import từ đây khi consumer là pure logic không cần runtime.
 *
 */
export {
  EVM_NATIVE_TOKEN_ADDRESS,
  EVM_ZERO_ADDRESS,
  isNativeTokenAddress,
  isSameAddress,
  isValidAddress,
  isZeroAddress,
  parseChecksumAddress,
  shortenAddress,
  toAddressKey,
  toChecksumAddress,
  truncateAddress,
} from "./address.utils"
