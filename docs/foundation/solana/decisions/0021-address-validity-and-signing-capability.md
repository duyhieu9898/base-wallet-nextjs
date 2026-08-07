# 0021 Address validity and signing capability are separate questions

## Purpose

On EVM, "is this a valid address" has one answer, and EIP-55 checksumming exists
to catch typos. Both properties tempt a direct port.

Neither survives on Solana, and getting this wrong loses funds.

## Decision

Two separate predicates:

- `isValidAddress` — decodes to a 32-byte base58 public key. **Accepts Program
  Derived Addresses.**
- `isSignableAddress` — additionally requires the key to lie on the ed25519
  curve, i.e. a keypair can sign for it.

A PDA is deliberately **off**-curve: it is a valid account address that no
private key controls. It is how every program-owned account is addressed —
including the stake and reward vaults this product reads.

Folding the two checks into one fails in one of two directions. Reject off-curve
keys, and the runtime cannot read any program-owned account. Accept them
everywhere, and a PDA passes as a transfer recipient, sending funds to an address
nobody can move them from.

## Required behavior

- Reads and account lookups use `isValidAddress`.
- Anywhere a wallet or a plain transfer recipient is required, use
  `isSignableAddress`.
- **No case folding, anywhere.** Base58 is case-sensitive: `abc` and `Abc` are
  different addresses, not different renderings of one. There is no checksum and
  no `toChecksumAddress` equivalent. `isSameAddress` compares decoded keys.
- A transaction signature is **64 bytes**, not 32, and Solana calls it a
  signature rather than a hash. An EVM-shaped length check rejects every valid
  one, which is why `isValidSignature` exists separately from address validation.
- `toAddressKey` returns the canonical base58 form and throws on an invalid
  address, rather than returning a key that silently never matches.

## No native-token sentinel

`@nln/web3-evm` uses a sentinel address to mean "the native asset". There is no
`SOLANA_NATIVE_TOKEN_ADDRESS` here.

Native SOL is a lamport balance on the account itself, not an SPL mint. A
sentinel would be a fiction that invites downstream code to query it as a mint.
Native reads are a separate call.

## Test environment note

Under jsdom, Vitest resolves the **Node** build of `@solana/web3.js`, which
derives PDAs using Node's `Buffer`, while jsdom installs its own `Uint8Array`
global from a separate realm. The `instanceof Uint8Array` check inside
`@noble/hashes` then fails for every candidate nonce, and the library reports the
misleading "Unable to find a viable program address nonce".

Any test deriving a PDA needs `// @vitest-environment node`. Browsers are
unaffected — they load the browser build, which carries its own Buffer shim, and
this was verified in a real browser to return the same address and bump as Node.

## Code and tests

- `packages/web3-solana/src/address/address.utils.ts`
- `packages/web3-solana/src/address/address.utils.test.ts` — the PDA under test
  is derived, not pinned, so the off-curve property is real rather than asserted.
