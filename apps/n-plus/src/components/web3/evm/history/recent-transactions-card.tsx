import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/web3/evm/common/status-badge"
import { PendingReceiptReconciler } from "@nln/web3-evm"
import { useTranslation } from "@/i18n/use-translation"
import { getEvmExplorerUrl } from "@nln/web3-evm"
import { useEvmSelection } from "@nln/web3-evm"
import { useEvmTransactionHistory } from "@nln/web3-evm"
/**
 * Composes the two halves of transaction history (decision 0012).
 *
 * The mechanical record comes from the foundation. `describeActivity` is how the
 * application supplies the business half from whichever feature store owns it —
 * returning null for a hash it does not know, in which case the row renders as a
 * plain contract write. That fallback is required: a feature's activity store can
 * fail to write without the transaction being any less real, and composing the two
 * sources must never drop or duplicate a row.
 */
export function RecentTransactionsCard(
  props: {
    describeActivity?: (hash: `0x${string}`) => string | null
  } = {},
) {
  const { describeActivity } = props
  const selection = useEvmSelection()
  const { t } = useTranslation()
  const isReady = selection.status === "ready"
  const currentAccount = isReady ? selection.account : undefined
  const currentChainId = isReady ? selection.chainId : undefined

  const { transactions, clearTransactions } = useEvmTransactionHistory({
    filterCurrentAccount: true,
    filterCurrentChain: true,
  })

  const handleClearHistory = () => {
    if (currentAccount && currentChainId) {
      clearTransactions({
        account: currentAccount,
        chainId: currentChainId,
      })
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">
          {t.history.title}
        </CardTitle>
        {transactions.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={handleClearHistory}>
            {t.history.clearHistory}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {transactions.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t.history.empty}</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={`${tx.chainId}:${tx.hash}`}
                className="border-border bg-muted/20 space-y-1.5 rounded-md border p-3 text-sm"
              >
                {tx.status === "pending" ? (
                  <PendingReceiptReconciler
                    chainId={tx.chainId}
                    hash={tx.hash}
                    kind={tx.kind}
                    tokenAddress={
                      tx.kind === "native-transfer"
                        ? undefined
                        : tx.tokenAddress
                    }
                  />
                ) : null}

                <div className="flex items-center justify-between">
                  <span className="font-mono font-medium">
                    {describeActivity?.(tx.hash) ?? tx.kind}
                  </span>
                  <StatusBadge status={tx.status} />
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div>
                    <span className="text-muted-foreground">
                      {t.common.txHash}:{" "}
                    </span>
                    <a
                      className="font-mono underline underline-offset-2"
                      href={getEvmExplorerUrl(
                        tx.chainId,
                        tx.hash,
                        "transaction",
                      )}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                    </a>
                  </div>

                  <div>
                    <span className="text-muted-foreground">
                      {t.common.time}:{" "}
                    </span>
                    <span>{new Date(tx.submittedAt).toLocaleTimeString()}</span>
                  </div>

                  <div>
                    <span className="text-muted-foreground">
                      {t.common.amount}:{" "}
                    </span>
                    <span className="font-semibold">
                      {tx.amount} {tx.assetSymbol}
                    </span>
                  </div>

                  {/* Render recipient only for actions that have it */}
                  {tx.kind === "native-transfer" ||
                  tx.kind === "token-transfer" ? (
                    <div>
                      <span className="text-muted-foreground">
                        {t.common.recipient}:{" "}
                      </span>
                      <a
                        className="font-mono underline underline-offset-2"
                        href={getEvmExplorerUrl(
                          tx.chainId,
                          tx.recipient,
                          "address",
                        )}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        {tx.recipient.slice(0, 6)}...{tx.recipient.slice(-4)}
                      </a>
                    </div>
                  ) : null}

                  {/* Render spender only for approvals */}
                  {tx.kind === "token-approval" ? (
                    <div>
                      <span className="text-muted-foreground">
                        {t.common.spender}:{" "}
                      </span>
                      <a
                        className="font-mono underline underline-offset-2"
                        href={getEvmExplorerUrl(
                          tx.chainId,
                          tx.spender,
                          "address",
                        )}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        {tx.spender.slice(0, 6)}...{tx.spender.slice(-4)}
                      </a>
                    </div>
                  ) : null}

                  {/* Contract the write was sent to — an address, not a token */}
                  {tx.kind === "contract-write" ? (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">
                        {t.common.contract}:{" "}
                      </span>
                      <a
                        className="font-mono underline underline-offset-2"
                        href={getEvmExplorerUrl(
                          tx.chainId,
                          tx.contractAddress,
                          "address",
                        )}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        {tx.contractAddress}
                      </a>
                    </div>
                  ) : null}

                  {/* Token contract — only when the write moved an ERC-20 */}
                  {tx.kind !== "native-transfer" &&
                  tx.kind !== "contract-write" ? (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">
                        {t.common.contract}:{" "}
                      </span>
                      <a
                        className="font-mono underline underline-offset-2"
                        href={getEvmExplorerUrl(
                          tx.chainId,
                          tx.tokenAddress,
                          "token",
                        )}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        {tx.tokenAddress}
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
