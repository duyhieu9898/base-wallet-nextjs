# Solana Runtime Decisions

Decisions thuộc riêng runtime `@nln/web3-solana`. Chúng nói về Solana semantics —
cluster, genesis hash, base58, PDA, SPL mint, token account, commitment level,
wallet adapter — nên chúng **không** phải foundation policy và không áp dụng cho
family khác.

Decisions family-neutral: [`../../decisions/README.md`](../../decisions/README.md).
EVM runtime decisions: [`../../evm/decisions/README.md`](../../evm/decisions/README.md).
Application decisions: [`../../../decisions/README.md`](../../../decisions/README.md).

## Decision index

| ID   | Decision                                              |
| ---- | ----------------------------------------------------- |
| 0018 | Cluster selection and identity                        |
| 0019 | Balance reads are registry-driven                     |
| 0020 | Token decimals are verified against the on-chain mint |
| 0021 | Address validity and signing capability are separate  |

ID không bao giờ được đánh lại. Chúng là duy nhất trên toàn repository và thư mục
mới là thứ mang scope — `0018` là Solana vì nó nằm ở đây, không phải vì con số.
Đó là lý do dãy bắt đầu từ `0018` chứ không phải `0001`: `0001`–`0017` đã thuộc về
EVM runtime và foundation.

## Phạm vi hiện tại: chỉ read path

Bốn decision này phủ những gì phase 1 đã implement thật. Chúng **không** nói gì về
write.

Quyết định về write đã có nhưng chưa thành decision record ở đây: bằng chứng
terminal là `confirmed` cho luồng người dùng, indexer đọc `finalized` là sổ cái
đối chiếu. Nó được chấp nhận ngày 2026-08-07 và ghi tại
[`../../solana-runtime-requirement.md`](../../solana-runtime-requirement.md)
mục "Item 3 acceptance". Nó chuyển thành decision record ở đây khi write path
được implement — trước đó thì chưa có semantics nào để mô tả.

Kế hoạch thi công:
[`../../../plans/active/solana-runtime.md`](../../../plans/active/solana-runtime.md).
