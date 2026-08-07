# EVM Runtime Decisions

Decisions thuộc riêng runtime `@nln/web3-evm`. Chúng nói về EVM semantics —
chainId, ERC-20, allowance, spender, receipt, Wagmi, Viem — nên chúng không phải
foundation policy và không áp dụng cho family khác.

Decisions family-neutral: [`../../decisions/README.md`](../../decisions/README.md).
Application decisions: [`../../../decisions/README.md`](../../../decisions/README.md).

## Decision index

| ID   | Decision                                       |
| ---- | ---------------------------------------------- |
| 0001 | Network and token registry                     |
| 0002 | Selector policy: find vs get                   |
| 0003 | Native asset model                             |
| 0004 | Web3 error normalization                       |
| 0005 | Write readiness and submission safety          |
| 0006 | Wallet selection state                         |
| 0007 | Shared read logic                              |
| 0008 | Write hooks and transaction lifecycle          |
| 0009 | Cache ownership and invalidation               |
| 0011 | Transaction review and fee preview             |
| 0012 | Local transaction history                      |
| 0015 | Feature write flows and approval orchestration |
| 0016 | Feature contract registry                      |

Tiêu đề của các decision này viết chung chung ("Network and token registry",
"Write hooks and transaction lifecycle") vì chúng được viết khi EVM là runtime
duy nhất. Contract thực tế của chúng là EVM: `EvmRuntimeConfig`,
`EvmNetworkConfig`, `useSendEvm*`, hash/receipt lifecycle. Thư mục này là nơi ghi
nhận điều đó.

## Khi family thứ hai xuất hiện

Không sửa các decision ở đây để "bao" luôn family mới. Không có generic lifecycle
decision phủ cả EVM lẫn Solana — đó là abstraction trước evidence, và
`../../EXTENSION_CONTRACT.md` §5 cấm.

Family mới tạo `docs/foundation/<family>/decisions/` và chỉ viết decision khi
semantics tương ứng đã được implement thật. Nó không copy thư mục này.

## ID space

ID duy nhất trên toàn foundation, không renumber khi move. Xem
[`../../decisions/README.md`](../../decisions/README.md) mục "ID space".

## Update policy, structure, writing rules

Giống family-neutral decisions — xem
[`../../decisions/README.md`](../../decisions/README.md).
