"use client"

import {
  describeStakingActivity,
  StakingPositionCard,
} from "@/features/staking"
import { BalanceCard } from "@/components/web3/evm/balance/balance-card"
import { TransferSection } from "@/components/web3/evm/forms/transfer-section"
import { RecentTransactionsCard } from "@/components/web3/evm/history/recent-transactions-card"
import { NetworkCard } from "@/components/web3/evm/network/network-card"
import { UnsupportedNetworkCard } from "@/components/web3/evm/network/unsupported-network-card"
import { WalletCard } from "@/components/web3/evm/wallet/wallet-card"
import { getEvmTokensForChain, useEvmWallet } from "@nln/web3-evm"
/**
 * Web3Lab is a dev-only test harness assembling production-grade Web3 domain components.
 */
export function Web3Lab() {
  const wallet = useEvmWallet()
  const { selection } = wallet

  // The whole registry list for this chain, not its first entry: adding a token
  // to `evm-tokens.json` must be enough to see and use it here.
  const tokens =
    selection.status === "ready" ? getEvmTokensForChain(selection.chainId) : []

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
            tokens={tokens}
          />
          <StakingPositionCard />
          {/* The application composes the two history stores: the foundation
              supplies the mechanical record, the staking feature the business
              meaning of the hashes it owns. */}
          <RecentTransactionsCard describeActivity={describeStakingActivity} />
        </>
      ) : null}
    </div>
  )
}
