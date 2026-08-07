# 0003 Native asset model

## Purpose

Native currency và ERC-20 token có contract model khác nhau: native currency không có contract address và không dùng `balanceOf`. Gộp hai loại asset vào một registry buộc phải bịa ra address giả hoặc sentinel value.

## Decision

- Native asset lấy từ `chain.nativeCurrency`.
- Native asset không nằm trong `evm-tokens.json`.
- Native asset không có ERC-20 contract address.
- `getEvmNetworkNativeAsset()` là selector chính thức cho native metadata.
- Native balance và token balance dùng query path riêng.

## Required behavior

- Native balance đọc qua native balance path, không qua contract read.
- Token balance đọc qua ERC-20 contract path.
- `useEvmNativeBalance` và `useEvmTokenBalance` là hai hook tách biệt.

## Boundaries

- Không gọi `balanceOf` cho native asset.
- Không tạo ERC-20 metadata giả — zero address, sentinel address hoặc token entry — cho native asset.
- Normalize về shared display model chỉ được làm ở boundary UI phù hợp, không ở tầng registry.

## Enforcement

- Type system: native asset type tách khỏi ERC-20 token type.
- Registry validation từ chối token entry không phải `erc20`.
- Hook boundary tách `useEvmNativeBalance` và `useEvmTokenBalance`.

## Code and tests

Implementation:

- `packages/web3-evm/src/chain/registry/evm-network.registry.ts`
- `packages/web3-evm/src/reads/balances/use-evm-native-balance.ts`
- `packages/web3-evm/src/reads/balances/use-evm-token-balance.ts`
- `packages/web3-evm/src/chain/registry/registry.types.ts`

Tests:

- `packages/web3-evm/src/chain/registry/evm-network.registry.test.ts`
- `packages/web3-evm/src/reads/balances/evm-balance.adapter.test.ts`
