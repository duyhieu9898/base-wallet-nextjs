"use client"

import { useReadContract } from "wagmi"

import { findStakingDeployment } from "../contracts/staking-deployments"
import { findEvmToken, useEvmSelection } from "@nln/web3-evm"
/** Read the two balances the deployed test vault actually owns; no reward or lock semantics are inferred. */
export function useStakingPosition() {
  const selection = useEvmSelection()
  const chainId = selection.status === "ready" ? selection.chainId : undefined
  const account = selection.status === "ready" ? selection.account : undefined
  const deployment = chainId ? findStakingDeployment(chainId) : null
  const activeDeployment =
    deployment?.status === "active" ? deployment : undefined
  const enabled = Boolean(account && chainId && activeDeployment)

  const nativeStake = useReadContract({
    address: activeDeployment?.contractAddress,
    abi: activeDeployment?.abi,
    functionName: "nativeStakeOf",
    args: account ? [account] : undefined,
    chainId,
    query: { enabled },
  })
  const tokenStake = useReadContract({
    address: activeDeployment?.contractAddress,
    abi: activeDeployment?.abi,
    functionName: "usdcStakeOf",
    args: account ? [account] : undefined,
    chainId,
    query: { enabled },
  })

  return {
    selection,
    deployment,
    nativeAmount:
      typeof nativeStake.data === "bigint" ? nativeStake.data : null,
    tokenAmount: typeof tokenStake.data === "bigint" ? tokenStake.data : null,
    // Symbol and decimals come from the registry, never from a literal: the
    // vault's ERC-20 is whatever its deployment points at.
    token:
      chainId && activeDeployment
        ? (findEvmToken(chainId, activeDeployment.tokenAddress) ?? null)
        : null,
    nativeCurrency:
      selection.status === "ready"
        ? selection.network.chain.nativeCurrency
        : null,
    isPending: enabled && (nativeStake.isPending || tokenStake.isPending),
    error: nativeStake.error ?? tokenStake.error ?? null,
    refetch: async () => {
      await Promise.all([nativeStake.refetch(), tokenStake.refetch()])
    },
  }
}
