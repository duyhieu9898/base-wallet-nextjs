# Hướng dẫn nhận test funds

Repository **không** tạo private key, không commit seed phrase, không automate faucet.
Tài liệu này chỉ chuẩn bị đường dẫn để nhận test assets thật trên testnet đã cấu hình.

## Nguyên tắc an toàn

- Tạo một **wallet development riêng**. Không dùng wallet đang giữ mainnet assets.
- Testnet tokens không có giá trị tài chính, nhưng vẫn dùng ví riêng để cô lập.
- KHÔNG commit private key / seed phrase / `.env.local` vào source control. `.env*`
  đã được gitignore trừ `.env.example`, và `scripts/*.local.ts` cũng vậy.

## Network đang được cấu hình

Nguồn sự thật là `packages/web3-evm/src/chain/registry/evm-network.registry.ts`. Hiện registry có
đúng hai network:

| Network          | Loại    | Chain ID   | Faucet trong registry                |
| ---------------- | ------- | ---------- | ------------------------------------ |
| Ethereum Sepolia | testnet | `11155111` | Chainlink (native), Circle (USDC)    |
| Ethereum Mainnet | mainnet | `1`        | — (không có, và sẽ không bao giờ có) |

Network mặc định lấy từ `VITE_DEFAULT_CHAIN_ID` trong `.env.local`
(`.env.example` đặt sẵn `11155111`). Dev và production dùng giá trị khác nhau, nên
nó nằm ở env chứ không hardcode. Chain ID không có trong registry sẽ làm app fail
ngay lúc boot thay vì chạy nhầm mạng.

Muốn thêm network mới thì sửa registry — không có biến env nào bật/tắt được network.

## 1. Nhận native gas token (Sepolia ETH)

<https://faucets.chain.link/>

Link này cũng hiện ngay trong UI: mở `/web3-lab`, phần **Network** liệt kê faucet
của network đang chọn (chỉ testnet mới có).

## 2. Nhận testnet USDC

<https://faucet.circle.com/>

## 3. Add USDC vào wallet

Địa chỉ token nằm trong `packages/web3-evm/src/chain/registry/evm-tokens.json`. Trên Sepolia:

```text
0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
Decimals: 6
```

Import bằng đúng address ứng với network đang chọn.

## 4. Kiểm tra balance thật

Mở `/web3-lab` (chỉ có ở dev), connect ví, chọn network. UI đọc native + USDC
balance thật qua RPC. Không có mock RPC hay mock balance ở đây.

RPC mặc định là public endpoint của `viem/chains`. Nếu bị rate limit, đặt endpoint
riêng qua `VITE_RPC_ETHEREUM_SEPOLIA` / `VITE_RPC_ETHEREUM_MAINNET`
(xem `.env.example`).

## 5. Test self-transfer nhỏ

Trong `/web3-lab`, phần **Transactions**:

1. Recipient mặc định là chính địa chỉ ví của bạn.
2. Nhập một lượng rất nhỏ, nhấn **Prepare / Review**.
3. Với ERC-20, bước này chạy simulation trước — chỉ khi simulation OK mới hiện
   review card. Simulation revert nghĩa là chưa broadcast, chưa tốn gas.
4. Đọc kỹ review card (asset, recipient, amount, phí tối đa ước tính) rồi nhấn
   **Confirm & Send**.
5. Đợi receipt: UI hiện `success` / `reverted`, kèm link explorer.
6. Refetch balance sau khi receipt thành công.

Mainnet có cảnh báo riêng trên review card. Approve không giới hạn cũng có cảnh báo
riêng.

## 6. Smoke test registry (không cần ví)

```bash
pnpm web3:smoke                 # toàn bộ registry, gồm cả mainnet
pnpm web3:smoke -- --chainId 11155111
```

Script đọc block number và metadata token thật qua RPC để xác nhận registry khớp
on-chain. Chỉ đọc, không ký, không broadcast — không cần private key.

## 7. (Tuỳ chọn) Dev send script

`scripts/web3-sepolia-send.local.ts` broadcast một transaction Sepolia nhỏ qua
adapter thật, dùng để verify tầng adapter/mạng end-to-end mà không cần UI.

Script đọc key từ `process.env.SEPOLIA_DEV_PRIVATE_KEY`. **Repository không lưu sẵn
key nào** — muốn chạy thì tự đặt key test của bạn vào `.env.local`:

```dotenv
SEPOLIA_DEV_PRIVATE_KEY=0x...key-test-testnet-cua-ban...
```

```bash
npx tsx scripts/web3-sepolia-send.local.ts
```

Script gửi self-transfer rất nhỏ native + USDC trên Sepolia, đợi receipt và in
explorer link. Key chỉ tồn tại local. Xoá nó khỏi `.env.local` khi dùng xong —
một key nằm lâu trong file env là một key sớm muộn cũng bị lộ.

Lớp hook/UI/wagmi connector vẫn nên được test thêm qua browser tại `/web3-lab`.
