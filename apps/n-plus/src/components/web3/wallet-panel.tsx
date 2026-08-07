"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "@/i18n/use-translation"
import { useEvmBalances, useEvmWallet } from "@nln/web3-evm"
export function WalletPanel() {
  const { t } = useTranslation()
  const {
    wallet,
    selection,
    connectors,
    connect,
    disconnect,
    connectError,
    switchChain,
    switchChainPending,
  } = useEvmWallet()

  const { native, tokens, isPending: balancePending } = useEvmBalances()

  if (selection.status === "unsupported") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t.wallet.unsupportedTitle}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            {t.wallet.unsupportedDesc.replace(
              "{chainId}",
              String(selection.walletChainId),
            )}
          </p>

          {selection.networks.map((network) => (
            <Button
              key={network.chain.id}
              className="w-full"
              variant="outline"
              disabled={switchChainPending}
              onClick={() => switchChain({ chainId: network.chain.id })}
            >
              {switchChainPending
                ? t.common.switching
                : t.wallet.switchChain.replace("{name}", network.chain.name)}
            </Button>
          ))}

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => disconnect()}
          >
            {t.common.disconnect}
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!wallet.connected) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t.wallet.connectTitle}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {connectors.map((connector) => (
            <Button
              key={connector.uid}
              className="w-full"
              disabled={wallet.connecting}
              onClick={() => {
                connect({ connector })
              }}
            >
              {wallet.connecting ? t.common.connecting : connector.name}
            </Button>
          ))}

          {connectError && (
            <p className="text-destructive text-sm">{connectError.message}</p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t.wallet.title}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">{t.common.address}</dt>

            <dd className="font-mono break-all">{wallet.address}</dd>
          </div>

          <div>
            <dt className="text-muted-foreground">{t.common.chainId}</dt>

            <dd>{selection.walletChainId}</dd>
          </div>

          <div>
            <dt className="text-muted-foreground">{t.wallet.nativeBalance}</dt>

            <dd>
              {balancePending
                ? t.common.loading
                : native
                  ? `${native.formattedAmount} ${native.symbol}`
                  : t.wallet.noData}
            </dd>
          </div>

          {tokens.length > 0 && (
            <div>
              <dt className="text-muted-foreground">
                {t.wallet.tokenBalances}
              </dt>
              <dd className="space-y-1">
                {tokens.map((tokenItem) => (
                  <div
                    key={tokenItem.tokenAddress}
                    className="flex justify-between font-mono"
                  >
                    <span>
                      {tokenItem.status === "success"
                        ? `${tokenItem.balance.formattedAmount} ${tokenItem.balance.symbol}`
                        : t.wallet.readBalanceError}
                    </span>
                  </div>
                ))}
              </dd>
            </div>
          )}
        </dl>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            disconnect()
          }}
        >
          {t.common.disconnect}
        </Button>
      </CardContent>
    </Card>
  )
}
