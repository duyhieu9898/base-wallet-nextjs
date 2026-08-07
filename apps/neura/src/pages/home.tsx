import {
  useSolanaNativeBalance,
  useSolanaSelection,
  useSolanaTokenBalances,
  type SolanaAssetBalance,
} from "@nln/web3-solana"
import { useWallet } from "@solana/wallet-adapter-react"

/**
 * Formats a raw integer amount without floating point.
 *
 * `Number(raw) / 10 ** decimals` loses precision above 2^53, which a u64 token
 * amount reaches. String surgery on the integer does not.
 */
function formatAmount(raw: bigint, decimals: number): string {
  const text = raw.toString().padStart(decimals + 1, "0")
  const whole = text.slice(0, text.length - decimals)
  const fraction = text.slice(text.length - decimals).replace(/0+$/, "")

  return fraction ? `${whole}.${fraction}` : whole
}

function BalanceRow({ balance }: { balance: SolanaAssetBalance }) {
  return (
    <li className="flex justify-between border-b py-2 last:border-b-0">
      <span className="font-medium">{balance.symbol}</span>
      <span className="font-mono tabular-nums">
        {formatAmount(balance.raw, balance.decimals)}
      </span>
    </li>
  )
}

export default function HomePage() {
  const selection = useSolanaSelection()
  const { wallets, select, disconnect } = useWallet()
  const native = useSolanaNativeBalance()
  const tokens = useSolanaTokenBalances()

  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col justify-center gap-6 px-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Neura</h1>
        <p className="text-muted-foreground text-sm">
          {selection.cluster.name} · status: {selection.status}
        </p>
      </header>

      {selection.status === "ready" ? (
        <section className="flex flex-col gap-4">
          <p className="font-mono text-sm break-all">{selection.account}</p>

          {native.data ? (
            <ul className="text-sm">
              <BalanceRow balance={native.data} />
              {tokens.data?.map((balance) => (
                <BalanceRow key={balance.mint} balance={balance} />
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">Reading balances…</p>
          )}

          {(native.error ?? tokens.error) && (
            <p className="text-destructive text-sm">
              {(native.error ?? tokens.error)?.message}
            </p>
          )}

          <button
            type="button"
            onClick={() => void disconnect()}
            className="self-start rounded-md border px-3 py-1.5 text-sm"
          >
            Disconnect
          </button>
        </section>
      ) : (
        <section className="flex flex-col gap-2">
          {/* Wallets register themselves through the Wallet Standard, so this
              list is whatever the browser actually has — not a build-time set. */}
          {wallets.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No Solana wallet detected in this browser.
            </p>
          ) : (
            wallets.map((wallet) => (
              <button
                key={wallet.adapter.name}
                type="button"
                onClick={() => select(wallet.adapter.name)}
                className="self-start rounded-md border px-3 py-1.5 text-sm"
              >
                Connect {wallet.adapter.name}
              </button>
            ))
          )}
        </section>
      )}
    </main>
  )
}
