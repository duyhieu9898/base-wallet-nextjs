"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/web3/common/status-badge"
import { PendingReceiptReconciler } from "@/components/web3/history/pending-receipt-reconciler"
import { useTranslation } from "@/i18n/use-translation"
import { getEvmExplorerUrl } from "@/web3/evm/adapters/evm-registry.adapter"
import { useEvmSelection } from "@/web3/evm/selection/use-evm-selection"
import { useEvmTransactionHistory } from "@/web3/evm/hooks/use-evm-transaction-history"

export function RecentTransactionsCard() {
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
                    action={tx.action}
                    tokenAddress={
                      tx.action !== "native-transfer"
                        ? tx.tokenAddress
                        : undefined
                    }
                  />
                ) : null}

                <div className="flex items-center justify-between">
                  <span className="font-mono font-medium">{tx.action}</span>
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
                  {tx.action === "native-transfer" ||
                  tx.action === "token-transfer" ? (
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
                  {tx.action === "token-approval" ? (
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

                  {/* Token contract — only for token actions */}
                  {tx.action !== "native-transfer" ? (
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
