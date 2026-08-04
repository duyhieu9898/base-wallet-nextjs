"use client"

import { BalanceCard } from "@/components/web3/balance/balance-card"
import { TransferSection } from "@/components/web3/forms/transfer-section"
import { RecentTransactionsCard } from "@/components/web3/history/recent-transactions-card"
import { NetworkCard } from "@/components/web3/network/network-card"
import { UnsupportedNetworkCard } from "@/components/web3/network/unsupported-network-card"
import { WalletCard } from "@/components/web3/wallet/wallet-card"
import { StakingPositionCard } from "@/features/staking/components/staking-position-card"
import { getEvmTokensForChain } from "@/web3/evm/adapters/evm-registry.adapter"
import { useEvmWallet } from "@/web3/evm/hooks/use-evm-wallet"

/**
 * Web3Lab is a dev-only test harness assembling production-grade Web3 domain components.
 */
export function Web3Lab() {
  const wallet = useEvmWallet()
  const { selection } = wallet

  const token =
    selection.status === "ready"
      ? (getEvmTokensForChain(selection.chainId)[0] ?? null)
      : null

  return (
    <div className="space-y-6">
      <WalletCard />

      {selection.status === "unsupported" ? (
        <UnsupportedNetworkCard
          walletChainId={selection.walletChainId}
          networks={selection.networks}
          onSwitch={(chainId) => wallet.switchChain({ chainId })}
          switchPending={wallet.switchChainPending}
        />
      ) : null}

      {selection.status === "ready" ? (
        <>
          <NetworkCard
            networks={selection.networks}
            network={selection.network}
            onSwitch={(chainId) => wallet.switchChain({ chainId })}
            switchPending={wallet.switchChainPending}
          />
          <BalanceCard
            chainId={selection.chainId}
            network={selection.network}
          />
          <TransferSection
            chainId={selection.chainId}
            network={selection.network}
            token={token}
          />
          <StakingPositionCard />
          <RecentTransactionsCard />
        </>
      ) : null}
    </div>
  )
}
