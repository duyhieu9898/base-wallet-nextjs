import { useState } from "react"

import { useTransactionFeedback } from "@/components/web3/common/transaction-feedback"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getEvmExplorerUrl, useApproveEvmToken } from "@nln/web3-evm"
import { TransactionStatus } from "@/components/web3/evm/common/transaction-status"
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
    tokenAddress: deployment.tokenAddress,
    spenderAddress: deployment.contractAddress,
    onReceiptSuccess,
  })
  const write = useStakingWrite({ onReceiptSuccess })
  // Every user-facing asset name resolves through the registry. A literal here
  // would be wrong on any chain whose native asset or vault token differs.
  const symbolFor = (value: StakingAsset) =>
    value === "native"
      ? (write.nativeSymbol ?? "native")
      : (write.stakingToken?.symbol ?? "token")
  // Only a successful receipt unblocks the stake (0015). A reverted approval or
  // one whose receipt cannot be reached blocks it just the same, but for a
  // different reason — the label has to say which, otherwise a dead approval
  // reads as one still in flight.
  const approvalAwaitingReceipt =
    approve.hash !== null && approve.receiptStatus !== "success"
  const approvalNeedsRecovery =
    approve.receiptStatus === "reverted" || approve.receiptError !== null
  // The notification must name the transaction being signed. Read it from the
  // prepared write rather than the pickers above: `prepared` is what the wallet
  // is actually asked to sign, and it is what `confirm()` submits.
  const feedbackTitle = `${operation === "stake" ? "Stake" : "Unstake"} ${
    write.prepared?.assetSymbol ?? symbolFor(asset)
  }`
  const feedback = useTransactionFeedback({
    title: feedbackTitle,
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
        {(["native", "token"] as const).map((value) => (
          <Button
            key={value}
            variant={asset === value ? "default" : "outline"}
            size="sm"
            disabled={write.prepared !== null}
            onClick={() => setAsset(value)}
          >
            {symbolFor(value)}
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

      {asset === "token" && operation === "stake" ? (
        <StakingApprovalPanel
          approval={approve}
          amount={amount}
          chainId={chainId}
          tokenSymbol={symbolFor("token")}
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
            asset === "token" &&
            operation === "stake" &&
            approvalAwaitingReceipt
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
            ? approvalNeedsRecovery
              ? "Approval did not succeed — reset it above"
              : "Waiting for approval receipt…"
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
