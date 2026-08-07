# Application decisions

Decisions riêng của các application trong repository này. Không thay thế, không
copy foundation decisions.

| Scope       | Location                                                                |
| ----------- | ----------------------------------------------------------------------- |
| Application | `docs/decisions/` — thư mục này                                         |
| Foundation  | [`../foundation/decisions/`](../foundation/decisions/README.md)         |
| EVM runtime | [`../foundation/evm/decisions/`](../foundation/evm/decisions/README.md) |

Nếu một invariant thuộc reusable Web3 foundation thay đổi, sửa foundation
decision — không ghi đè bằng application decision.

| ID   | Decision                                                       |
| ---- | -------------------------------------------------------------- |
| 0001 | [Auth session transport (SIWE)](auth-session-transport.md)     |
| 0013 | [i18n and hydration policy](0013-i18n-and-hydration-policy.md) |

`0013` giữ nguyên ID của nó từ khi còn nằm trong foundation. Nó chi phối
`I18nProvider` trong application shell và không chi phối package nào, nên nó là
application decision. ID không được renumber khi move — xem
[`../foundation/decisions/README.md`](../foundation/decisions/README.md) mục
"ID space".

ID `0001` ở bảng trên thuộc application ID space và không liên quan tới `0001`
của EVM runtime. Khi thêm application decision mới, ưu tiên đặt tên theo chủ đề
(`auth-session-transport.md`) thay vì cấp số mới.
