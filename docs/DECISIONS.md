# Foundation Decisions Moved

Decisions được chia theo scope:

| Scope       | Location                                                          | Nội dung                       |
| ----------- | ----------------------------------------------------------------- | ------------------------------ |
| Foundation  | [`foundation/decisions/`](foundation/decisions/README.md)         | Rule đúng với mọi chain family |
| EVM runtime | [`foundation/evm/decisions/`](foundation/evm/decisions/README.md) | Rule riêng của `@nln/web3-evm` |
| Application | [`decisions/`](decisions/README.md)                               | Rule riêng của các application |

ID là duy nhất trên toàn foundation và không đổi khi file được move giữa các
scope — tham chiếu dạng `0015` vẫn trỏ đúng một decision duy nhất.

Application decisions không được thay thế hoặc copy foundation decisions.
