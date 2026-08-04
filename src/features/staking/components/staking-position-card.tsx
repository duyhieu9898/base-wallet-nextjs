"use client"

import { useState } from "react"
import { formatEther, formatUnits } from "viem"

import { TransactionReviewCard } from "@/components/web3/common/transaction-review-card"
import { TransactionStatus } from "@/components/web3/common/transaction-status"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useApproveEvmToken } from "@/web3/evm/hooks/use-approve-evm-token"
import { useStakingPosition } from "../hooks/use-staking-position"
import {
  type StakingAsset,
  type StakingOperation,
  useStakingWrite,
} from "../hooks/use-staking-write"

export function StakingPositionCard() {
  const position = useStakingPosition()
  const [asset, setAsset] = useState<StakingAsset>("native")
  const [operation, setOperation] = useState<StakingOperation>("stake")
  const [amount, setAmount] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const deployment =
    position.deployment?.status === "active" ? position.deployment : null
  const approve = useApproveEvmToken({
    tokenAddress: deployment?.usdcAddress,
    spenderAddress: deployment?.contractAddress,
    onReceiptSuccess: () => void position.refetch(),
  })
  const write = useStakingWrite({
    onReceiptSuccess: () => void position.refetch(),
  })
  const approvalAwaitingReceipt =
    approve.hash !== null && approve.receiptStatus !== "success"

  if (position.selection.status !== "ready") return null

  if (!deployment) {
    return (
      <section className="border-border rounded-lg border p-4">
        <h2 className="font-semibold">Test staking vault</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          No test-vault deployment is configured for this network.
        </p>
      </section>
    )
  }

  function showError(cause: unknown) {
    setFormError(cause instanceof Error ? cause.message : String(cause))
  }

  return (
    <section className="border-border space-y-3 rounded-lg border p-4">
      <div>
        <h2 className="font-semibold">Test staking vault</h2>
        <p className="text-muted-foreground text-sm">
          Test fixture: no reward or lock period.
        </p>
      </div>

      {position.isPending ? (
        <p className="text-muted-foreground text-sm">
          Reading on-chain position…
        </p>
      ) : position.error ? (
        <p className="text-destructive text-sm">
          Could not read staking position: {position.error.message}
        </p>
      ) : (
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Staked ETH</dt>
            <dd className="font-medium">
              {position.nativeAmount === null
                ? "—"
                : formatEther(position.nativeAmount)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Staked USDC</dt>
            <dd className="font-medium">
              {position.usdcAmount === null
                ? "—"
                : formatUnits(position.usdcAmount, 6)}
            </dd>
          </div>
        </dl>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => void position.refetch()}
      >
        Refresh position
      </Button>

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
          <div className="space-y-2 rounded border p-3 text-sm">
            <p className="text-muted-foreground">
              Approve this exact USDC amount before staking.
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={approve.review !== null}
              onClick={() => {
                setFormError(null)
                try {
                  approve.prepare({ amount })
                } catch (cause) {
                  showError(cause)
                }
              }}
            >
              Prepare USDC approval
            </Button>
            {approve.review ? (
              <TransactionReviewCard
                review={approve.review}
                feeEstimate={approve.feeEstimate}
                isExecuting={approve.isWriting}
                disabled={
                  !approve.canApprove ||
                  approve.isPreparing ||
                  approve.isWriting ||
                  approve.hash !== null
                }
                onConfirm={() => void approve.confirmApprove().catch(showError)}
                confirmLabel="Confirm USDC approval"
              />
            ) : null}
            <TransactionStatus
              chainId={position.selection.chainId}
              hash={approve.hash}
              receiptStatus={approve.receiptStatus}
              isReceiptLoading={approve.isReceiptLoading}
              error={approve.error}
              formError={null}
            />
          </div>
        ) : null}

        {write.prepared ? (
          <div className="space-y-2 rounded border p-3 text-sm">
            <p>
              Review: {write.prepared.operation}{" "}
              {write.prepared.formattedAmount} {write.prepared.assetSymbol}
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
              onClick={() => void write.confirm().catch(showError)}
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
              asset === "usdc" &&
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
              ? "Waiting for approval receipt…"
              : `Prepare ${operation}`}
          </Button>
        )}
        <TransactionStatus
          chainId={position.selection.chainId}
          hash={write.hash}
          receiptStatus={write.receiptStatus}
          isReceiptLoading={write.isReceiptLoading}
          error={write.error}
          formError={formError}
        />
      </div>
    </section>
  )
}
