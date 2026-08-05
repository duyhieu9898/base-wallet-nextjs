"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeTransferForm } from "@/components/web3/forms/native-transfer-form"
import { TokenApproveForm } from "@/components/web3/forms/token-approve-form"
import { TokenTransferForm } from "@/components/web3/forms/token-transfer-form"
import { useTranslation } from "@/i18n/use-translation"
import { type AssetContractConfig, type EvmNetworkConfig } from "@/web3/evm"
export function TransferSection(props: {
  chainId: number
  network: EvmNetworkConfig
  token: AssetContractConfig | null
}) {
  const { chainId, network, token } = props
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t.transfer.title.replace(
            "{stage}",
            network.chain.testnet
              ? `(${t.common.testnet})`
              : `(${t.common.mainnet})`,
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        <NativeTransferForm chainId={chainId} network={network} />
        {token ? (
          <>
            <hr className="border-border" />
            <TokenTransferForm chainId={chainId} token={token} />
            <hr className="border-border" />
            <TokenApproveForm chainId={chainId} token={token} />
          </>
        ) : (
          <p className="text-muted-foreground">{t.transfer.noTokenAvailable}</p>
        )}
      </CardContent>
    </Card>
  )
}
