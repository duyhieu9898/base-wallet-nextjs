# 0001 Auth session transport (SIWE)

Application decision. Không thay thế và không copy foundation decisions dưới
`docs/foundation/decisions/`.

## Purpose

Application cần một cách xác thực người dùng bằng EVM wallet thay cho password
authentication mock trước đây, đồng thời không làm yếu các invariant của Web3
foundation (selection readiness, submission safety, cache ownership).

Decision này chốt **current truth** về:

- protocol xác thực;
- nơi lưu refresh token và access token;
- ai là authority của session;
- application phản ứng thế nào khi wallet không khớp session.

## Decision

### Protocol

```text
Protocol: SIWE (EIP-4361)
Wallet family: EVM
Signer support: EOA
Identity principal: normalized EVM address
Password authentication: không hỗ trợ
Email / social / OAuth: không hỗ trợ
```

EIP-1271 (contract wallet signature) **chưa được hỗ trợ**: mock chỉ recover chữ
ký EOA theo EIP-191, và backend production chưa tồn tại trong repository này. Ví
smart-account sẽ ký thành công nhưng verify sẽ từ chối.

### Token transport

```text
Refresh token
- chỉ nằm trong HttpOnly Cookie do backend set
- frontend JavaScript không đọc, không ghi, không thấy trong response JSON
- rotation thuộc trách nhiệm backend

Access token
- trả trong verify/refresh response body
- chỉ tồn tại trong memory của một provider runtime
- gắn vào Authorization: Bearer
- mất khi reload tab
```

Access token không được ghi vào localStorage, sessionStorage, IndexedDB, cookie,
React Query cache, Zustand persisted store, React context công khai, props hoặc
log.

### Session authority

Backend là authority duy nhất của application session. Frontend không suy ra
authenticated từ: wallet đang connected, wallet đã từng ký, access token string
còn tồn tại, hay query cache còn dữ liệu user cũ.

Một session chỉ authenticated sau khi backend trả authenticated payload hợp lệ
qua `POST /auth/siwe/verify` hoặc `POST /auth/refresh`.

### Bootstrap

`AuthRuntimeProvider` chạy đúng một bootstrap refresh khi mount:

```text
refresh 200   → authenticated
refresh 401   → unauthenticated
network / 5xx → unavailable  (KHÔNG phải unauthenticated)
```

`unavailable` không được render như đã logout và không được render protected
application.

### Refresh

Refresh là **single-flight** trong một provider runtime: nhiều caller đồng thời
chia sẻ đúng một request, promise được reset trong `finally`. Refresh không tự
gọi refresh khác và không retry vô hạn.

Baseline không có proactive refresh timer. Refresh xảy ra khi bootstrap và khi
một protected request trả 401 thuộc nhóm refreshable access-token error.

### Retry safety

```text
original request → tối đa một refresh → tối đa một replay → terminal result
```

Mặc định: `GET`/`HEAD` được replay; `POST`/`PUT`/`PATCH`/`DELETE` **không** được
replay. Mutation chỉ replay khi caller explicitly đánh dấu và endpoint contract
chứng minh idempotent. Interceptor không bao giờ replay wallet signature request
hoặc EVM transaction submission.

### Address binding

Trong authenticated state:

```text
session.user.walletAddress === SIWE message.address === verified signer
```

Khi sử dụng application:

```text
normalized connected address === normalized session address
```

So sánh address luôn qua `isSameAddress` trong `@/web3/core/address.utils`,
không dùng string equality thô và không tự viết bản chuẩn hoá riêng cho auth. Wallet mismatch hoặc wallet disconnected khi đang authenticated sẽ khoá
toàn application bằng blocking modal không thể dismiss (không backdrop, không
Escape, không close button). Modal tự unlock khi connected address khớp lại
session address; không cần ký lại.

Modal là presentation. Guard thật là `assertAuthenticatedWalletBinding()`, được
gọi trước protected mutation.

### Operation ownership

Auth runtime giữ một generation counter. Login, logout, reset và terminal
invalidation đều tăng generation. Mọi async operation capture generation lúc bắt
đầu và bỏ qua side effect nếu generation đã stale. Điều này bảo đảm response
đến muộn (verify cũ, refresh cũ) không thể khôi phục session sau logout hoặc ghi
đè session mới.

### Logout

Logout gọi backend để revoke refresh session. Chỉ `200`, `204` hoặc response
xác nhận session đã không tồn tại mới được coi là terminal success. Network
error và `5xx` giữ nguyên authenticated state và cho phép retry — không được
trình bày là logout thành công.

Logout success clear: access token memory, auth runtime transient state, và
user-scoped query cache.

Logout **không**: disconnect wallet, clear Wagmi connector state, clear EVM
selection, clear network/token registry, clear public on-chain data, clear
receipt evidence, clear local transaction history, hay clear i18n preference.

### User-scoped cache ownership

Query keys của dữ liệu gắn với backend identity nằm dưới một root chung
`queryKeys.userScoped.all`. Khi session kết thúc, `AuthRuntimeProvider` cancel +
remove đúng root đó (application có thể ghi đè qua prop `onSessionCleared`). Auth
không hardcode tên từng business feature và không đụng query key của Wagmi.

### Architecture boundary

Auth là **application foundation**, không phải reusable Web3 foundation.

```text
src/features/auth/  →  dùng public API của  →  src/web3/ (useEvmSelection, wagmi signing)
src/web3/           →  KHÔNG BAO GIỜ import →  src/features/auth/
```

Auth provider không được thêm vào `src/web3/web3-providers.tsx`. Application
provider composition (`src/app/providers.tsx`) chịu trách nhiệm đó.

## Required behavior

- Reload tab → access token mất → bootstrap refresh → session phục hồi hoặc
  terminal state rõ ràng.
- Hai request cùng expired → đúng một refresh → cả hai retry với token mới.
- Logout trong lúc refresh → logout generation thắng → refresh cũ bị bỏ.
- Wallet đổi trước signature → abort login, yêu cầu bắt đầu lại.
- Wallet đổi sau signature → không commit verify response cũ.
- Verify response có address khác snapshot → không commit.
- Wallet disconnect khi authenticated → blocking modal, session giữ nguyên.
- Wallet switch về đúng address → modal tự unlock.
- Wallet mismatch → logout vẫn khả dụng.
- Backend unavailable khi bootstrap → `unavailable`, không phải unauthenticated.
- Backend unavailable khi logout → giữ authenticated, cho retry.
- Refresh rejected → clear token → unauthenticated → clear user-scoped state.
- Protected mutation trả 401 → không replay mặc định.

## Boundaries

Decision này **không** claim:

- backend production đã tồn tại;
- database session persistence;
- refresh-token hashing, rotation family, reuse detection đã được implement;
- EIP-1271 / smart account signature verification được hỗ trợ;
- Next.js middleware route protection hoặc server component authentication;
- role/permission authorization policy cho business feature.

MSW mock **có** verify chữ ký thật: nó recover signer theo EIP-191 và so với
address ghi trong message. Nhờ vậy mock dùng được với ví thật khi chạy dev, chứ
không chỉ với chữ ký dựng sẵn trong test.

Mock vẫn **không** chứng minh: HttpOnly cookie semantics của browser thật, nonce
và session persistence phía server, rate limiting, hay CSRF policy. Những
guarantee đó thuộc backend và backend integration test.

## Enforcement

- Zod schemas runtime-validate mọi auth response (`src/features/auth/domain/auth.schemas.ts`).
- `AuthError` taxonomy riêng, không tái sử dụng `EvmWeb3Error`.
- Access token chỉ đi qua `AccessTokenStore` (memory-only factory, không singleton server).
- `AuthGeneration` chặn stale commit.
- `assertAuthenticatedWalletBinding()` chặn protected action ngoài UI overlay.
- Focused tests cạnh mỗi module (`*.test.ts(x)`), phủ: address binding,
  contract của bốn endpoint, token store, stale completion, single-flight,
  retry-at-most-once, bootstrap, blocking modal, logout cleanup.
- Validation: `pnpm format:check && pnpm typecheck && pnpm lint && pnpm test:run && pnpm build`.

## Code and tests

Implementation:

- `src/features/auth/domain/`
- `src/features/auth/api/`
- `src/features/auth/runtime/`
- `src/features/auth/hooks/`
- `src/features/auth/components/`
- `src/config/auth.config.ts`
- `src/lib/query/query-keys.ts`
- `src/mocks/handlers/auth-handlers.ts`

Tests:

- `src/features/auth/**/*.test.ts(x)`
