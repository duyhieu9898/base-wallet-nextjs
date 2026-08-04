# 0001 Network and token registry

## Purpose

Network và ERC-20 metadata là configuration, không phải kiến thức nằm rải rác trong UI và hooks. JSON configuration là untrusted input, nên invalid configuration phải fail tại import boundary thay vì lộ ra dưới dạng RPC failure ở runtime của người dùng cuối.

## Decision

- `EVM_NETWORKS` là map từ `chainId` đến `EvmNetworkConfig` và là nguồn duy nhất cho supported EVM networks.
- ERC-20 token được cấu hình theo chain trong `src/web3/evm/registry/evm-tokens.json`.
- Contract address là key của token entry.
- `hydrateTokens(rawTokens: unknown)` validate registry input tại runtime.
- RPC URL được override qua environment, không hardcode trong component hoặc hook.

Supported EVM network selection là configuration concern. Application adoption chọn network bằng cách giữ, thêm hoặc bỏ registry entries; foundation runtime không hardcode một production network.

## Required behavior

`hydrateTokens` reject configuration khi:

- top-level không phải object, hoặc là `null`, hoặc là array;
- token metadata không phải object;
- `type !== "erc20"`;
- `symbol` hoặc `name` rỗng sau `trim()`;
- `expectedDecimals` không phải integer `>= 0`;
- `enabled` không phải boolean;
- address không qua `isAddress()`;
- hai entry trùng nhau sau khi normalize address.

Invalid configuration fail tại boot/import boundary, trước khi UI hoặc RPC flow chạy.

Thêm hoặc thay một supported EVM network thông thường chỉ thay đổi:

- network registry;
- RPC environment configuration;
- token metadata;
- network-specific verification.

Selection model, write lifecycle, error taxonomy và cache ownership không được fork theo từng EVM network.

## Boundaries

- UI, hooks và scripts không hardcode network hoặc token metadata.
- Registry metadata không thay thế live on-chain validation; smoke tests đối chiếu `symbol` và `decimals` thật.
- Application-specific contracts không thuộc token registry.
- Registry schema thay đổi phải đi kèm runtime validation và tests trong cùng change.
- Network, token, RPC và explorer values được ship cùng base là reference defaults, không phải customer production requirements.
- Application adoption phải review và xóa hoặc thay sample entries không sử dụng.
- Public RPC defaults không được xem là production provider strategy.
- Feature contract deployments không thuộc network/token registry.
- Một network không tương thích với các EVM assumptions hiện tại cần architecture change, không được che bằng registry entry.

## Enforcement

- Runtime validation trong `hydrateTokens`.
- Type system qua `EvmNetworkConfig` và registry types.
- Pure registry tests.
- Live smoke tests đối chiếu metadata on-chain.

## Code and tests

Implementation:

- `src/web3/evm/registry/evm-network.registry.ts`
- `src/web3/evm/registry/evm-registry.types.ts`
- `src/web3/evm/registry/evm-tokens.json`
- `src/web3/evm/adapters/evm-registry.adapter.ts`

Tests:

- `src/web3/evm/registry/evm-network.registry.test.ts`
- `src/web3/evm/adapters/evm-registry.adapter.test.ts`
- `scripts/web3-smoke.ts`
