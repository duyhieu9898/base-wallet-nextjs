import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "@/i18n/use-translation"
import { type EvmNetworkConfig } from "@nln/web3-evm"
export function UnsupportedNetworkCard(props: {
  walletChainId: number
  networks: readonly EvmNetworkConfig[]
  onSwitch: (chainId: number) => void
  switchPending: boolean
}) {
  const { walletChainId, networks, onSwitch, switchPending } = props
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.wallet.unsupportedTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          {t.wallet.unsupportedDesc.replace("{chainId}", String(walletChainId))}
        </p>
        <div className="flex flex-wrap gap-2">
          {networks.map((network) => (
            <Button
              key={network.chain.id}
              variant="outline"
              disabled={switchPending}
              onClick={() => onSwitch(network.chain.id)}
            >
              {switchPending
                ? t.common.switching
                : t.wallet.switchChain.replace("{name}", network.chain.name)}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
