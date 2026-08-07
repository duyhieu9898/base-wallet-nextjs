"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { NativeTransferForm } from "@/components/web3/evm/forms/native-transfer-form"
import { TokenApproveForm } from "@/components/web3/evm/forms/token-approve-form"
import { TokenTransferForm } from "@/components/web3/evm/forms/token-transfer-form"
import { useTranslation } from "@/i18n/use-translation"
import { type AssetContractConfig, type EvmNetworkConfig } from "@nln/web3-evm"
export function TransferSection(props: {
  chainId: number
  network: EvmNetworkConfig
  tokens: readonly AssetContractConfig[]
}) {
  const { chainId, network, tokens } = props
  const { t } = useTranslation()
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null)

  // The selection is held by address, not by index: a registry edit reorders the
  // list, and an index would silently start pointing at a different token.
  const selected =
    tokens.find((token) => token.address === selectedAddress) ??
    tokens[0] ??
    null

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
        {selected ? (
          <>
            <hr className="border-border" />
            {tokens.length > 1 ? (
              <div className="flex flex-col gap-1">
                <Label>{t.transfer.selectToken}</Label>
                <div className="flex flex-wrap gap-2">
                  {tokens.map((token) => (
                    <Button
                      key={token.address}
                      variant={
                        token.address === selected.address
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => setSelectedAddress(token.address)}
                    >
                      {token.symbol}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
            {/* Remounted per token: the forms own prepare/review state that must
                not survive a switch to a different asset. */}
            <TokenTransferForm
              key={`transfer:${selected.address}`}
              chainId={chainId}
              token={selected}
            />
            <hr className="border-border" />
            <TokenApproveForm
              key={`approve:${selected.address}`}
              chainId={chainId}
              token={selected}
            />
          </>
        ) : (
          <p className="text-muted-foreground">{t.transfer.noTokenAvailable}</p>
        )}
      </CardContent>
    </Card>
  )
}
