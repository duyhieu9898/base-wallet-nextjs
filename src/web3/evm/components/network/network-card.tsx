"use client"

import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { StageBadge } from "@/components/web3/common/stage-badge"
import { useTranslation } from "@/i18n/use-translation"
import {
  type EvmNetworkConfig,
  getEvmNetworkExplorer,
  getEvmNetworkRpcUrl,
} from "@/web3/evm"
function Field(props: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{props.label}</Label>
      <div>{props.children}</div>
    </div>
  )
}

export function NetworkCard(props: {
  networks: readonly EvmNetworkConfig[]
  network: EvmNetworkConfig
  onSwitch: (chainId: number) => void
  switchPending: boolean
}) {
  const { networks, network, onSwitch, switchPending } = props
  const { t } = useTranslation()
  const explorer = getEvmNetworkExplorer(network)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.network.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <Field label={t.network.networkByWallet}>
          <select
            className="border-input bg-input/20 h-7 rounded-md border px-2 text-sm"
            value={network.chain.id}
            disabled={switchPending}
            onChange={(event) => onSwitch(Number(event.target.value))}
          >
            {networks.map((option) => (
              <option key={option.chain.id} value={option.chain.id}>
                {option.chain.name} ({option.chain.id})
              </option>
            ))}
          </select>
          {switchPending ? (
            <span className="text-muted-foreground ml-2">
              {t.common.switching}
            </span>
          ) : null}
        </Field>

        <Field label={t.network.stage}>
          <StageBadge isTestnet={network.chain.testnet} />
        </Field>

        <Field label={t.network.rpc}>
          <span className="font-mono text-sm break-all">
            {getEvmNetworkRpcUrl(network)}
          </span>
        </Field>

        <Field label={t.network.explorer}>
          <a
            className="underline underline-offset-2"
            href={explorer.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            {explorer.name}
          </a>
        </Field>

        {network.faucets.length > 0 ? (
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">
              {t.network.faucetTestnet}
            </p>
            {network.faucets.map((faucet) => (
              <a
                key={faucet.url}
                className="block underline underline-offset-2"
                href={faucet.url}
                target="_blank"
                rel="noreferrer noopener"
              >
                {faucet.label} ({faucet.assetType})
              </a>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
