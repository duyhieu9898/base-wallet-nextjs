"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useTranslation } from "@/i18n/use-translation"
import { getEvmExplorerUrl } from "@/web3/evm/adapters/evm-registry.adapter"
import { useEvmWallet } from "@/web3/evm/hooks/use-evm-wallet"

function Field(props: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{props.label}</Label>
      <div>{props.children}</div>
    </div>
  )
}

export function WalletCard() {
  const wallet = useEvmWallet()
  const { selection } = wallet
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.wallet.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {selection.status === "disconnected" ||
        selection.status === "connecting" ? (
          <>
            <p className="text-muted-foreground">{t.wallet.connectPrompt}</p>
            <div className="flex flex-wrap gap-2">
              {wallet.connectors.map((connector) => (
                <Button
                  key={connector.uid}
                  disabled={wallet.wallet.connecting}
                  onClick={() => wallet.connect({ connector })}
                >
                  {wallet.wallet.connecting
                    ? t.common.connecting
                    : connector.name}
                </Button>
              ))}
            </div>
            {wallet.connectError && (
              <p className="text-destructive">{wallet.connectError.message}</p>
            )}
          </>
        ) : (
          <>
            <Field label={t.common.address}>
              {selection.chainId && selection.account ? (
                <a
                  className="font-mono underline underline-offset-2"
                  href={getEvmExplorerUrl(
                    selection.chainId,
                    selection.account,
                    "address",
                  )}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {selection.account}
                </a>
              ) : (
                <span className="font-mono">{selection.account}</span>
              )}
            </Field>
            <Field label={t.wallet.walletChainId}>
              <span>{selection.walletChainId}</span>
            </Field>
            <Button variant="outline" onClick={() => wallet.disconnect()}>
              {t.common.disconnect}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
