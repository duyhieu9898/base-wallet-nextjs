# Solana family module boundary

Thư mục này tồn tại để chứng minh chain-family modules độc lập với EVM và với
application business logic.

Current status:

- module boundary: present;
- metadata catalog: present;
- SDK/runtime: not implemented;
- wallet integration: not implemented;
- reads/writes: not implemented;
- active provider composition: not implemented.

Solana không phải fallback cho EVM và không được mô tả như một production-ready
capability.

## Nguyên tắc kiến trúc

- Solana là module độc lập với EVM. Module này không import từ `web3/evm` và
  ngược lại.
- Family này khai báo address/account, transaction reference và asset types
  riêng khi có runtime. Không dùng `Address`/`Hash` của viem (đường EVM) cho
  Solana.
- Shared UI **không** import Solana SDK trực tiếp. UI chỉ giao tiếp qua adapter
  hooks nằm trong thư mục này.
- Không cố ép transaction/program model của Solana theo EVM (địa chỉ, network
  switching, signing semantics, token standard của hai bên khác nhau) và không
  tạo universal `sendTransaction()` ép hai family cùng input.
- Có thể dùng chung TanStack Query cho dữ liệu backend/indexer/price của Solana
  giống như các feature khác.

## Khi triển khai runtime

- Chọn SDK/React bindings hiện hành tại thời điểm đó (ví dụ `@solana/kit`,
  `@solana/react`, Solana Wallet Standard). Phiên bản cụ thể sẽ quyết định sau.
- Thêm `SolanaProvider` vào `web3/web3-providers.tsx` cùng runtime enable flag
  tương ứng — flag chỉ được thêm khi nó thật sự điều khiển một provider.
- Tạo adapter hooks (`use-solana-wallet`, `use-solana-balance`, …) với types
  riêng của family.
- Cập nhật `docs/foundation/CAPABILITIES.md` khi runtime chuyển từ deferred sang
  ready.

Không cài đặt bất kỳ package Solana nào trong bước hiện tại.

## Metadata catalog

`registry/solana-network.catalog.ts` lưu metadata-only cho devnet/mainnet (RPC,
explorer, native SOL, USDC mint, faucet, `enabled: false`, `runtimeImplemented:
false`). File này KHÔNG được import vào provider tree cho đến khi adapter Solana
được triển khai. Không dùng `ChainId` EVM cho Solana.
