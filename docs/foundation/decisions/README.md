# Foundation Decisions (family-neutral)

Thư mục này chỉ chứa decisions đúng với **mọi** chain family.

Decision của một runtime cụ thể nằm dưới thư mục của runtime đó:

| Scope       | Location                                          |
| ----------- | ------------------------------------------------- |
| Foundation  | `docs/foundation/decisions/` — thư mục này        |
| EVM         | [`../evm/decisions/`](../evm/decisions/README.md) |
| Application | [`../../decisions/`](../../decisions/README.md)   |

Mỗi file mô tả một responsibility ổn định:

- rule hiện tại;
- required behavior;
- architecture boundary;
- enforcement;
- code và tests sở hữu behavior đó.

Các file không phải changelog hoặc historical ADR archive.

## Decision index

| ID   | Decision                              |
| ---- | ------------------------------------- |
| 0010 | Testing strategy                      |
| 0014 | Web3 component organization           |
| 0017 | Error normalization and observability |

Ba decision này family-neutral vì rule của chúng được phát biểu dưới dạng
**hình dạng**, không phải cơ chế: bốn tầng proof; ranh giới là design-system
dependency; mỗi boundary sở hữu một domain error type. Mỗi cái nhận thêm một
instance của family mới mà không cần sửa rule.

## ID space

ID là **duy nhất trên toàn foundation** và không đổi khi file được move. Thư mục
mang scope; ID mang identity. Vì vậy index này có khoảng trống (`0010`, `0014`,
`0017`) — đó là chủ ý, không phải thiếu file. Tham chiếu dạng `0015` trong bất kỳ
tài liệu nào vẫn trỏ đúng một decision duy nhất.

Không renumber khi move. Renumber sẽ phá hàng chục tham chiếu dạng ID trần mà
không đổi lại được gì.

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

### Khi nào một decision là family-neutral?

Chỉ khi nó phát biểu được **không cần** các từ `receipt`, `chainId`, ERC-20,
allowance, spender, Wagmi, Viem — hoặc từ tương đương của một family khác. Nếu
cần, nó thuộc `<family>/decisions/`.

Không generalize một decision EVM đang có để "bao" luôn family thứ hai. Đó là
abstraction trước evidence, và `EXTENSION_CONTRACT.md` §5 cấm. Family mới viết
decision của riêng nó khi semantics được implement thật.

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
