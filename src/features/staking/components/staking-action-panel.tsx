"use client"

import { useState } from "react"

import { TransactionStatus } from "@/components/web3/common/transaction-status"
import { useTransactionFeedback } from "@/components/web3/common/transaction-feedback"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getEvmExplorerUrl, useApproveEvmToken } from "@/web3/evm"
import type { StakingDeployment } from "../contracts/staking-deployments"
import {
  type StakingAsset,
  type StakingOperation,
  useStakingWrite,
} from "../hooks/use-staking-write"
import { StakingApprovalPanel } from "./staking-approval-panel"

type ActiveStakingDeployment = Extract<StakingDeployment, { status: "active" }>

type StakingActionPanelProps = {
  deployment: ActiveStakingDeployment
  chainId: number
  onReceiptSuccess(): void
}

/** Owns the local input state and coordinates the feature's approval and staking hooks. */
export function StakingActionPanel({
  deployment,
  chainId,
  onReceiptSuccess,
}: StakingActionPanelProps) {
  const [asset, setAsset] = useState<StakingAsset>("native")
  const [operation, setOperation] = useState<StakingOperation>("stake")
  const [amount, setAmount] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const approve = useApproveEvmToken({
    tokenAddress: deployment.usdcAddress,
    spenderAddress: deployment.contractAddress,
    onReceiptSuccess,
  })
  const write = useStakingWrite({ onReceiptSuccess })
  const approvalAwaitingReceipt =
    approve.hash !== null && approve.receiptStatus !== "success"
  const feedback = useTransactionFeedback({
    title: "Stake USDC",
    status: write.status,
    hash: write.hash,
    error: write.error,
    getExplorerUrl: (transactionHash) =>
      getEvmExplorerUrl(chainId, transactionHash, "transaction"),
  })

  function showError(cause: unknown) {
    setFormError(cause instanceof Error ? cause.message : String(cause))
  }

  return (
    <div className="border-border space-y-3 border-t pt-3">
      <p className="font-medium">Stake / unstake</p>
      <div className="flex gap-2">
        {(["native", "usdc"] as const).map((value) => (
          <Button
            key={value}
            variant={asset === value ? "default" : "outline"}
            size="sm"
            disabled={write.prepared !== null}
            onClick={() => setAsset(value)}
          >
            {value === "native" ? "ETH" : "USDC"}
          </Button>
        ))}
        {(["stake", "unstake"] as const).map((value) => (
          <Button
            key={value}
            variant={operation === value ? "default" : "outline"}
            size="sm"
            disabled={write.prepared !== null}
            onClick={() => setOperation(value)}
          >
            {value}
          </Button>
        ))}
      </div>
      <Input
        value={amount}
        inputMode="decimal"
        placeholder="Amount"
        disabled={write.prepared !== null}
        onChange={(event) => setAmount(event.target.value)}
      />

      {asset === "usdc" && operation === "stake" ? (
        <StakingApprovalPanel
          approval={approve}
          amount={amount}
          chainId={chainId}
          onPrepare={() => setFormError(null)}
          onError={showError}
        />
      ) : null}

      {write.prepared ? (
        <div className="space-y-2 rounded border p-3 text-sm">
          <p>
            Review: {write.prepared.operation} {write.prepared.formattedAmount}{" "}
            {write.prepared.assetSymbol}
          </p>
          <p className="text-muted-foreground break-all">
            Contract: {deployment.contractAddress}
          </p>
          {write.isSimulating ? (
            <p className="text-muted-foreground">Simulating transaction…</p>
          ) : null}
          <Button
            disabled={
              !write.canConfirm || write.isWriting || write.hash !== null
            }
            onClick={() => {
              feedback.begin()
              void write.confirm().catch(showError)
            }}
          >
            {write.isWriting
              ? "Opening wallet…"
              : `Confirm ${write.prepared.operation}`}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={write.isWriting || write.hash !== null}
            onClick={() => write.reset()}
          >
            Reset
          </Button>
        </div>
      ) : (
        <Button
          disabled={
            asset === "usdc" && operation === "stake" && approvalAwaitingReceipt
          }
          onClick={() => {
            setFormError(null)
            try {
              write.prepare({ asset, operation, amount })
            } catch (cause) {
              showError(cause)
            }
          }}
        >
          {approvalAwaitingReceipt
            ? "Waiting for approval receipt…"
            : `Prepare ${operation}`}
        </Button>
      )}
      <TransactionStatus
        chainId={chainId}
        hash={write.hash}
        receiptStatus={write.receiptStatus}
        isReceiptLoading={write.isReceiptLoading}
        error={write.error}
        formError={formError}
      />
    </div>
  )
}
