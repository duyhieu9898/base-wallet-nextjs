# Foundation Decisions

Thư mục này chứa các quyết định hiện hành của reusable Web3 foundation.

Mỗi file mô tả một responsibility ổn định của foundation:

- rule hiện tại;
- required behavior;
- architecture boundary;
- enforcement;
- code và tests sở hữu behavior đó.

Các file không phải changelog hoặc historical ADR archive.

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
| 0010 | Testing strategy                               |
| 0011 | Transaction review and fee preview             |
| 0012 | Local transaction history                      |
| 0013 | i18n and hydration policy                      |
| 0014 | Web3 component organization                    |
| 0015 | Feature write flows and approval orchestration |
| 0016 | Feature contract registry                      |
| 0017 | Error normalization and observability          |

## Update policy

Khi rule thay đổi:

1. Ghi đè decision đang sở hữu responsibility đó.
2. Xóa nội dung không còn đúng.
3. Giữ filename và ID nếu responsibility không thay đổi.
4. Split hoặc rename chỉ khi responsibility thực sự được chia hoặc thay đổi.
5. Cập nhật code và tests trong cùng change set hoặc cùng PR.
6. Không tạo decision mới chỉ để ghi lại một bug fix hoặc implementation history.
7. Decision change chỉ có hiệu lực sau khi PR được merge vào main. Không dùng header `Approved-by`, `Approval-date` hay khối chữ ký riêng trong file.

Một proposal chưa được chấp nhận không thuộc thư mục này. Proposal hoặc execution detail phải nằm trong application plan, issue, pull request hoặc working notes phù hợp.

## Required structure

Mỗi decision dùng cấu trúc:

```text
Purpose
Decision
Required behavior
Boundaries
Enforcement
Code and tests
```

`Rationale` chỉ được thêm khi lý do không thể diễn đạt rõ trong `Purpose` hoặc `Boundaries`.

## Writing rules

- Viết ở hiện tại.
- Nói thẳng rule đang áp dụng.
- Dùng invariant có thể kiểm tra.
- Giữ đúng tên type, function, error code và file path.
- Không thêm ngày, status hoặc migration history.
- Không giữ alternative chỉ để chứng minh quá trình tranh luận.
- Chỉ link decision khác khi có dependency thực sự.
