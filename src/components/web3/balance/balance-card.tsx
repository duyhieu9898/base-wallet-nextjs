"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useTranslation } from "@/i18n/use-translation"
import {
  type EvmNetworkConfig,
  getEvmTokensForChain,
  useEvmNativeBalance,
  useEvmTokenBalance,
} from "@/web3/evm"
function Field(props: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{props.label}</Label>
      <div>{props.children}</div>
    </div>
  )
}

export function BalanceCard(props: {
  chainId: number
  network: EvmNetworkConfig
}) {
  const { chainId, network } = props
  const { t } = useTranslation()
  const tokens = getEvmTokensForChain(chainId)
  const token = tokens[0] ?? null

  const native = useEvmNativeBalance()
  const tokenBalance = useEvmTokenBalance({ tokenAddress: token?.address })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.balance.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Field
          label={t.balance.native.replace(
            "{symbol}",
            network.chain.nativeCurrency.symbol,
          )}
        >
          {native.isPending
            ? t.common.loading
            : native.balance
              ? `${native.balance.formattedAmount} ${native.balance.symbol}`
              : "—"}
        </Field>

        {token ? (
          <>
            <Field
              label={t.balance.tokenMetadata.replace("{symbol}", token.symbol)}
            >
              {token.name} · {token.expectedDecimals} decimals ·{" "}
              <span className="font-mono text-sm break-all">
                {token.address}
              </span>
            </Field>

            <Field
              label={t.balance.tokenBalance.replace("{symbol}", token.symbol)}
            >
              {tokenBalance.isPending
                ? t.common.loading
                : tokenBalance.balance
                  ? `${tokenBalance.balance.formattedAmount} ${tokenBalance.balance.symbol}`
                  : "—"}
            </Field>
          </>
        ) : (
          <p className="text-muted-foreground">{t.balance.noErc20Configured}</p>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => native.refetch()}>
            {t.balance.refetchNative}
          </Button>
          {token ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => tokenBalance.refetch()}
            >
              {t.balance.refetchToken.replace("{symbol}", token.symbol)}
            </Button>
          ) : null}
        </div>

        {(native.isError || tokenBalance.isError) && (
          <p className="text-destructive">
            {native.error?.message ?? tokenBalance.error?.message}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
