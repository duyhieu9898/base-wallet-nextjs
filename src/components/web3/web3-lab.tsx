"use client"

import { StakingPositionCard } from "@/features/staking"
import {
  BalanceCard,
  NetworkCard,
  RecentTransactionsCard,
  TransferSection,
  UnsupportedNetworkCard,
  WalletCard,
  getEvmTokensForChain,
  useEvmWallet,
} from "@/web3/evm"
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
