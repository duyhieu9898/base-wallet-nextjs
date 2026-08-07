import { useEffect, useState } from "react"
import { Activity, Coins, Users, Vault } from "lucide-react"

import { Main } from "@/components/layout/main"
import { Badge } from "@/components/ui/badge"
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

type ActivityItem = {
  id: string
  timestamp: string
  actor: string
  event: string
  reference: string
}

type OverviewData = {
  lending: {
    totalDepositedUsdt: string
    totalBorrowedUsdt: string
    activeBorrowers: number
    utilizationRate: string
  }
  staking: {
    totalStakedNra: string
    totalStakedUsdt: string
    activeStakers: number
    currentApy: string
  }
  members: {
    totalMembers: number
    activeMembersThisMonth: number
    totalTeamVolumeUsdt: string
  }
  recentActivities?: ActivityItem[]
}

export default function DashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/admin/overview`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load dashboard metrics.")
        return res.json()
      })
      .then((resData: OverviewData) => {
        setData(resData)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Error fetching dashboard data.",
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
              Overview Dashboard
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Live protocol metrics across Lending, Staking, and MLM
              Organisation.
            </p>
          </div>
        </div>

        {error && (
          <div className="text-destructive bg-destructive/10 border-destructive/20 mt-4 rounded border p-3 text-xs font-medium">
            {error}
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Lending Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Lending Pool
              </CardTitle>
              <Vault className="text-muted-foreground h-5 w-5" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    ${data?.lending.totalDepositedUsdt ?? "0.00"} USDT
                  </div>
                  <CardDescription className="mt-2 text-xs">
                    Borrowed: ${data?.lending.totalBorrowedUsdt} USDT (
                    {data?.lending.utilizationRate} utilization)
                  </CardDescription>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Active borrowers: {data?.lending.activeBorrowers}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Staking Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Staking Pool
              </CardTitle>
              <Coins className="text-muted-foreground h-5 w-5" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {data?.staking.totalStakedNra ?? "0"} NRA
                  </div>
                  <CardDescription className="mt-2 text-xs">
                    USDT Staked: ${data?.staking.totalStakedUsdt} | APY:{" "}
                    <span className="font-semibold text-emerald-600">
                      {data?.staking.currentApy}
                    </span>
                  </CardDescription>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Active stakers: {data?.staking.activeStakers}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* MLM Members Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Organisation
              </CardTitle>
              <Users className="text-muted-foreground h-5 w-5" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {data?.members.totalMembers ?? 0} Members
                  </div>
                  <CardDescription className="mt-2 text-xs">
                    Active this month: {data?.members.activeMembersThisMonth}
                  </CardDescription>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Team Volume: ${data?.members.totalTeamVolumeUsdt} USDT
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Table (C010100) */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" /> Recent System Activity
            </CardTitle>
            <CardDescription>
              Audit log of recent system events and operator triggers
            </CardDescription>
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
                    <TableHead>Time</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.recentActivities?.map((act) => (
                    <TableRow key={act.id}>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(act.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {act.actor}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{act.event}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold">
                        {act.reference}
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
