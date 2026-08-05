"use client"

import { useReadContract } from "wagmi"

import { findStakingDeployment } from "../contracts/staking-deployments"
import { useEvmSelection } from "@/web3/evm"
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
  const usdcStake = useReadContract({
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
    usdcAmount: typeof usdcStake.data === "bigint" ? usdcStake.data : null,
    isPending: enabled && (nativeStake.isPending || usdcStake.isPending),
    error: nativeStake.error ?? usdcStake.error ?? null,
    refetch: async () => {
      await Promise.all([nativeStake.refetch(), usdcStake.refetch()])
    },
  }
}
