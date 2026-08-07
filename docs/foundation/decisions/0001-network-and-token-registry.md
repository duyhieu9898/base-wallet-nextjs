# 0001 Network and token registry

## Purpose

Network và ERC-20 metadata là configuration, không phải kiến thức nằm rải rác trong UI và hooks. JSON configuration là untrusted input, nên invalid configuration phải fail tại import boundary thay vì lộ ra dưới dạng RPC failure ở runtime của người dùng cuối.

## Decision

- `EvmRuntimeConfig` (`networks: readonly EvmNetworkConfig[]` + `defaultChainId`) là nguồn duy nhất cho supported EVM networks. Consumer dựng nó và inject; foundation **không** giữ danh sách network ở module scope.
- Một representation duy nhất, chain-scoped: `EvmNetworkConfig` đã mang `tokens` và `rpcUrlOverride`, nên runtime config **không** được thêm map `tokens`/`rpcUrls` song song. Hai nguồn cho cùng dữ liệu lệch nhau âm thầm.
- ERC-20 token được cấu hình theo chain trong JSON **do application sở hữu** (app hiện tại: `src/config/evm-tokens.json`). Path nằm ngoài foundation vì consumer là người cung cấp tokens.
- Contract address là key của token entry.
- `hydrateTokens(rawTokens: unknown)` validate registry input tại runtime. Foundation sở hữu validator; application sở hữu data.
- `createEvmRuntimeConfig` validate config tại thời điểm dựng: network rỗng, `chainId` trùng, hoặc `defaultChainId` không nằm trong danh sách đều fail ngay.
- RPC URL được override qua environment, không hardcode trong component hoặc hook. **Tên biến environment thuộc application**: application đọc env và truyền vào `rpcUrlOverride`. Foundation chỉ biết thứ tự resolve `rpcUrlOverride` → `chain.rpcUrls.default`.
- Đọc registry trước khi consumer inject config là lỗi bootstrap, báo bằng `RUNTIME_NOT_CONFIGURED` — không giả vờ là `NETWORK_NOT_FOUND`.

Supported EVM network selection là configuration concern. Application adoption chọn network bằng cách giữ, thêm hoặc bỏ registry entries; foundation runtime không hardcode một production network.

Tiêu chí nghiệm thu: **consumer cấu hình được foundation mà không sửa một dòng nào bên trong foundation.** `scripts/web3-smoke.ts` là consumer thứ hai chứng minh điều này — nó tự dựng config từ env và install, không đi qua React.

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
- Foundation không import application config và không đọc `process.env` theo tên cố định.
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

- `packages/web3-evm/src/chain/registry/evm-network.registry.ts`
- `packages/web3-evm/src/chain/registry/evm-registry.types.ts`
- `packages/web3-evm/src/chain/registry/evm-runtime-config.ts`
- `packages/web3-evm/src/chain/registry/evm-registry.adapter.ts`
- `packages/web3-evm/src/config/index.ts` — public leaf React-free để consumer dựng và install config
- `src/config/web3.config.ts` + `src/config/evm-tokens.json` — application data (không thuộc foundation)

Tests:

- `packages/web3-evm/src/chain/registry/evm-network.registry.test.ts`
- `packages/web3-evm/src/chain/registry/evm-registry.adapter.test.ts`
- `scripts/web3-smoke.ts`
