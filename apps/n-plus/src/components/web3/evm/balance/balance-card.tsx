import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useTranslation } from "@/i18n/use-translation"
import { type EvmNetworkConfig } from "@nln/web3-evm"
import { getEvmTokensForChain } from "@nln/web3-evm"
import { useEvmBalances } from "@nln/web3-evm"
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
  // Every token the registry configures for this chain, read in one multicall.
  // Picking `tokens[0]` here is what made a newly registered token invisible.
  const tokenConfigs = getEvmTokensForChain(chainId)
  const balances = useEvmBalances()

  const balanceByAddress = balances.byAddress
  const failureByAddress = new Map(
    balances.tokens
      .filter((item) => item.status === "failure")
      .map((item) => [item.tokenAddress, item] as const),
  )

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
          {balances.isPending
            ? t.common.loading
            : balances.native
              ? `${balances.native.formattedAmount} ${balances.native.symbol}`
              : "—"}
        </Field>

        {tokenConfigs.length === 0 ? (
          <p className="text-muted-foreground">{t.balance.noErc20Configured}</p>
        ) : (
          tokenConfigs.map((token) => {
            const balance = balanceByAddress.get(token.address)
            const failure = failureByAddress.get(token.address)

            return (
              <div key={token.address} className="space-y-2">
                <Field
                  label={t.balance.tokenMetadata.replace(
                    "{symbol}",
                    token.symbol,
                  )}
                >
                  {token.name} · {token.expectedDecimals} decimals ·{" "}
                  <span className="font-mono text-sm break-all">
                    {token.address}
                  </span>
                </Field>

                <Field
                  label={t.balance.tokenBalance.replace(
                    "{symbol}",
                    token.symbol,
                  )}
                >
                  {balances.isPending ? (
                    t.common.loading
                  ) : balance ? (
                    `${balance.formattedAmount} ${balance.symbol}`
                  ) : failure ? (
                    // One unreadable token must not hide the others.
                    <span className="text-destructive">
                      {failure.error.message}
                    </span>
                  ) : (
                    "—"
                  )}
                </Field>
              </div>
            )
          })
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => balances.refetch()}
          >
            {t.balance.refetchNative}
          </Button>
        </div>

        {balances.isError ? (
          <p className="text-destructive">{balances.errors[0]?.message}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
