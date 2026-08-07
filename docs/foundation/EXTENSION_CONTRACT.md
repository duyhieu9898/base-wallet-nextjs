# Foundation Extension Contract

Tài liệu này định nghĩa cách application và feature được phép sử dụng, giới hạn và mở rộng Web3 foundation.

Nội dung ở đây là **family-neutral**: nó áp dụng cho mọi chain family. Public
surface, tier và extension checklist của một runtime cụ thể thuộc tài liệu của
runtime đó — EVM: [`evm/EXTENSION_CONTRACT.md`](evm/EXTENSION_CONTRACT.md).

## 1. Nguyên tắc chung

Application được phép:

- sử dụng ít capability hơn foundation;
- thêm product constraints chặt hơn;
- compose nhiều foundation hooks;
- thêm business validation;
- thêm feature-specific contracts;
- thêm warnings và application policy;
- thêm backend/indexer/analytics;
- triển khai feature-specific services và components.

Application không được âm thầm làm yếu foundation safety invariant.

## 1.1. Application adoption contract

Khi foundation được dùng để xây một dApp, application phải quyết định:

1. Adopt family module nào.
2. Bật network nào.
3. Default network là gì.
4. Feature nào dùng family context nào.
5. Application restrictions nào được thêm.
6. Contract deployments nằm ở đâu.

Foundation không quyết định thay application những mục trên.

### Assumption EVM hiện tại

Việc một dApp "tạm giả định khách hàng dùng EVM" là quyết định của application project, không phải foundation invariant.

Ghi quyết định đó trong application docs, một record cho mỗi application:

```text
docs/product/<app>/foundation-adoption.md
```

Bảng tổng hợp application ↔ runtime nằm ở
[`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) §2.

Ví dụ:

```markdown
## Adopted runtime

- EVM module

## Initial network assumption

- Sepolia during development
- Final production network pending customer decision
```

Không sửa foundation decision chỉ vì khách hàng đổi Sepolia → Arbitrum hoặc Ethereum → Polygon.

### Adoption flows

#### EVM-only dApp

- enable EVM module;
- configure supported EVM networks;
- add feature contracts trong application layer.

#### Additional-family dApp

Chỉ thực hiện sau khi family runtime được hoàn thành theo
`CHAIN_FAMILY_TEMPLATE.md`. Không load EVM providers nếu
application không adopt EVM.

## 2. Stricter, not weaker

Application có thể ràng buộc chặt hơn foundation.

Ví dụ hợp lệ:

```text
Foundation:
mọi chain nằm trong registry đều có thể write

Application:
chỉ cho write trên Sepolia
```

Ví dụ không hợp lệ:

```text
Foundation:
transaction phải Prepare → Review → Confirm

Application:
gọi writeContract trực tiếp để bỏ review
```

Application restriction là product policy.

Bypass foundation safety là architecture violation.

## 3. Public consumption boundary

Application tiêu thụ public API của family module đã adopt. Family module quyết
định public surface của mình; file tree bên trong là private, và ESLint enforce
ranh giới đó.

Foundation không liệt kê public path ở đây. Mỗi runtime khai báo public
entrypoint của chính nó, tường minh, không suy ra từ việc application đang import
gì:

```text
EVM     evm/EXTENSION_CONTRACT.md §1 và §2
```

Ba quy tắc áp dụng cho mọi family:

1. **Public surface là khai báo, không phải quan sát.** Một path không được liệt
   kê là internal, kể cả khi nó import được.
2. **Provider không nằm trong barrel chính.** Provider composition đi qua
   `@/providers/web3-providers` của application, nơi application chọn family
   runtime nào được mount. Package không tự quyết định điều đó.
3. **Primitive mở rộng dành cho feature là public có kiểm soát.** Một family có
   thể export primitive để feature tự dựng contract-specific write flow, nhưng
   feature dùng chúng vẫn phải giữ nguyên safety obligation của runtime — xem
   `FEATURE_MODULE_CONTRACT.md` §5. Export một primitive không phải là miễn trừ
   nghĩa vụ.

Application UI không được, với bất kỳ family nào:

- gọi thẳng low-level client cho flow mà runtime đã hỗ trợ;
- submit transaction trực tiếp từ component;
- tự map lỗi của thư viện bên dưới;
- tự invalidate cache do runtime sở hữu;
- đọc internal refs/state của write hooks;
- import internal test helpers.

## 4. Feature-local ownership

Một capability bắt đầu ở feature layer khi nó:

- chỉ có một consumer;
- chứa business-specific semantics;
- phụ thuộc custom contract;
- có application-specific permission hoặc UX;
- chưa chứng minh được shared invariant.

Ví dụ:

```text
src/features/staking/
├── components/
├── hooks/
├── adapters/
├── services/
├── contracts/
└── types/
```

Staking-specific concerns:

- staking contract address;
- reward calculation;
- lock duration;
- claim policy;
- pool status;

không tự động thuộc foundation.

## 5. Khi nào promote vào foundation?

Một primitive chỉ được promote từ feature vào foundation khi:

1. Có ít nhất hai consumer thực tế hoặc một invariant rõ ràng sẽ được dùng lại.
2. Semantics giữa các consumer thực sự giống nhau.
3. Feature-local duplication đã xuất hiện.
4. Abstraction không che mất contract/domain differences.
5. Có public API rõ.
6. Có runtime boundary rõ.
7. Có tests chứng minh invariant.
8. Migration cost được hiểu.
9. Foundation capability và decisions được cập nhật.

Không promote abstraction chỉ vì tên function giống nhau.

## 6. Feature contract registry

Custom contract deployments mặc định thuộc feature.

Ví dụ:

```text
src/features/staking/contracts/staking-contracts.ts
```

Chỉ tạo shared feature-contract registry khi nhiều feature cần chung các semantics:

- chain-based deployment lookup;
- enabled/disabled deployment;
- runtime address validation;
- typed feature key;
- deployment environment policy.

## 7. Error handling

Feature được phép thêm feature-specific error codes.

Feature không được:

- thay đổi meaning của foundation error codes;
- trình bày một preflight/simulation failure như một failure đã lên chain;
- kết luận terminal status khi runtime chưa cung cấp terminal evidence của nó;
- hiển thị raw RPC payload không được sanitize.

Feature error có thể wrap foundation error và giữ original cause. Error code cụ
thể và phase semantics thuộc từng runtime — EVM: `evm/EXTENSION_CONTRACT.md` §3.

## 8. Cache ownership

Runtime-owned data (tên cụ thể tùy family):

- account asset balances;
- spending authorization state, nếu family có khái niệm đó;
- transaction confirmation evidence;
- registry metadata;
- local Web3 transaction history.

Feature-owned data:

- staking positions;
- vault shares;
- indexed events;
- prices;
- backend transaction metadata;
- user-specific application records.

Feature không mirror runtime-owned data sang store riêng nếu không có requirement và invalidation policy rõ.

## 9. Application restrictions

Application có thể tạo policy riêng như:

- chỉ cho phép một số chain;
- chỉ cho phép một số token;
- cấm unlimited approval;
- đặt maximum transfer amount;
- yêu cầu authentication;
- yêu cầu compliance acknowledgement;
- giới hạn feature theo region/account.

Application restriction phải nằm trong application product/decision docs, không sửa foundation decision trừ khi foundation invariant thay đổi.

## 10. Foundation modification rule

Một feature không được sửa foundation chỉ để giải quyết local convenience.

Foundation chỉ thay đổi khi:

- public reusable capability thay đổi;
- invariant thay đổi;
- shared extension point được thêm;
- bug nằm trong foundation;
- feature đã chứng minh shared abstraction cần thiết.

Foundation change phải:

1. có focused scope;
2. cập nhật architecture/capabilities/decisions liên quan;
3. có regression tests;
4. không phụ thuộc ngược vào feature;
5. không hardcode application policy.

## 11. Dependency direction

```text
Application feature
      ↓ uses
Family runtime public API
      ↓
Thư viện và SDK bên dưới của runtime đó
```

Không hợp lệ:

```text
Web3 foundation
      ↓ imports
Application feature
```

Foundation không được biết staking, payment, vault hoặc application-specific route.

## 12. Foundation adoption record

Mỗi application giữ record riêng của mình:

```text
docs/product/<app>/foundation-adoption.md
```

Một record cho mỗi application, kể cả khi hai application cùng adopt một runtime:
network, restriction và deviation của chúng khác nhau. Bảng tổng hợp application
↔ runtime nằm ở [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) §2.

Nội dung tối thiểu:

```markdown
# Foundation Adoption

Foundation: base-wallet-nextjs
Foundation commit/version: <value>

## Adopted chain-family modules

- ...

## Supported networks và default network

- ...

## Adopted capabilities

- ...

## Application restrictions

- ...

## Local extensions

- ...

## Known deviations

- ...
```

Application docs chỉ link foundation decisions cần thiết, không copy toàn bộ foundation internals.

## 13. Thêm một chain-family runtime

Checklist mở rộng bên trong một runtime (thêm network, token, read hook, write
hook, feature contract) thuộc tài liệu của runtime đó — EVM:
[`evm/EXTENSION_CONTRACT.md`](evm/EXTENSION_CONTRACT.md) §5.

Mục này chỉ nói về việc thêm **một family mới**.

Một chain family mới không được ép vào abstraction của một family đã có nếu
semantics khác. Cần xác định riêng:

- wallet selection;
- account model;
- transaction lifecycle;
- registry;
- reads/writes;
- error taxonomy;
- provider boundaries;
- cache ownership;
- terminal confirmation evidence.

Ngoài ra:

- family mới là sibling package, không nằm trong package của family khác;
- shared core chỉ chứa concepts thực sự đồng nhất, và chỉ sau khi có **hai
  runtime đã implement** chứng minh điều đó;
- application choice không đồng nghĩa foundation change: bật/tắt một family
  trong một dApp không phải lý do sửa foundation decision.

Requirement record bắt buộc trước khi viết code, ownership list và definition of
done: [`CHAIN_FAMILY_TEMPLATE.md`](CHAIN_FAMILY_TEMPLATE.md).

## 14. Decision filters

Trước khi thêm một abstraction hoặc dependency vào foundation, phải trả lời:

1. Có consumer thật hay mới chỉ là dự đoán?
2. Đây là concern dùng chung hay business-specific?
3. Logic có thể ở feature layer không?
4. Có duplication thực tế cần loại bỏ không?
5. Abstraction có che mất domain semantics quan trọng không?
6. Invariant của abstraction có thể kiểm thử không?
7. Dependency có tạo vendor lock-in không cần thiết không?
8. Khi xóa consumer đầu tiên, abstraction còn giá trị không?
9. Có làm tăng runtime state hoặc failure modes không?
10. Có thay đổi public API hoặc migration cost không?

Không có câu trả lời rõ ràng thì mặc định giữ implementation nhỏ và local.
