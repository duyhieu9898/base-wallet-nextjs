import { useEffect, useState } from "react"
import { ShieldCheck } from "lucide-react"

import { Main } from "@/components/layout/main"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { API_BASE_URL } from "@/config/api.config"
import { type PayoutStatus } from "@/types/domain"

type BonusRun = {
  id: string
  period: string
  accruedAmountUsdt: string
  paidAmountUsdt: string
  eligiblePositions: number
  status: PayoutStatus
  executedAt: string | null
}

type BonusData = {
  summary: {
    totalAccruedUsdt: string
    totalPaidUsdt: string
    pendingPayoutUsdt: string
    lastRunAt: string
  }
  runs: BonusRun[]
}

export default function RewardsPage() {
  const [data, setData] = useState<BonusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/admin/bonuses`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load bonus reward data.")
        return res.json()
      })
      .then((resData: BonusData) => {
        setData(resData)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Error fetching rewards data.",
        )
        setLoading(false)
      })
  }, [])

  return (
    <>
      <Main>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Bonus Run & Reward Payouts
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage unilevel MLM bonus calculation runs, accrued totals, and
              payout confirmations.
            </p>
          </div>
        </div>

        {error && (
          <div className="text-destructive bg-destructive/10 border-destructive/20 mt-4 rounded border p-3 text-xs font-medium">
            {error}
          </div>
        )}

        {/* KPI Summary */}

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Bonus Accrued</CardDescription>
              <CardTitle className="text-2xl">
                {loading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  `$${data?.summary.totalAccruedUsdt} USDT`
                )}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Bonus Paid</CardDescription>
              <CardTitle className="text-2xl font-bold text-emerald-600">
                {loading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  `$${data?.summary.totalPaidUsdt} USDT`
                )}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Payout</CardDescription>
              <CardTitle className="text-2xl font-bold text-amber-600">
                {loading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  `$${data?.summary.pendingPayoutUsdt} USDT`
                )}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Bonus Runs Table */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4" /> Bonus Calculation Periods
                </CardTitle>
                <CardDescription>
                  Monthly payout runs and status
                </CardDescription>
              </div>
              <Button size="sm">Trigger Bonus Run</Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">
                      Accrued Amount (USDT)
                    </TableHead>
                    <TableHead className="text-right">
                      Paid Amount (USDT)
                    </TableHead>
                    <TableHead className="text-right">
                      Eligible Positions
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Executed Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.runs.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="text-xs font-bold">
                        {run.period}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        ${run.accruedAmountUsdt}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-emerald-600">
                        ${run.paidAmountUsdt}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {run.eligiblePositions}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            run.status === "Confirmed" ? "default" : "secondary"
                          }
                        >
                          {run.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {run.executedAt
                          ? new Date(run.executedAt).toLocaleString()
                          : "Not executed"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
