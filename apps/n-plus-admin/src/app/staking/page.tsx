"use client"

import { useEffect, useState } from "react"
import { Coins } from "lucide-react"

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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"

import { API_BASE_URL } from "@/config/api.config"

type StakingPoolConfig = {
  nraRewardPerBlock: string
  usdtMatchRatio: string
  lockupDurationDays: number
  rewardMultiplierRankBonus: string
  isPaused: boolean
}

export default function StakingPage() {
  const [config, setConfig] = useState<StakingPoolConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/admin/pools/staking`)
      .then((res) => res.json())
      .then((data: StakingPoolConfig) => {
        setConfig(data)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!config) return
    setSaving(true)
    setMsg(null)

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/pools/staking`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })

      const data = await res.json()
      if (res.ok) {
        setMsg("Configuration saved successfully!")
        if (data.config) setConfig(data.config)
      } else {
        setMsg("Failed to save configuration.")
      }
    } catch {
      setMsg("Network error saving configuration.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Main>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Staking Pool Configuration
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Configure NRA/USDT reward distribution per block, lockup periods,
              and rank multipliers.
            </p>
          </div>
        </div>

        <Card className="mt-6 max-w-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Coins className="h-4 w-4" /> NRA ⇄ USDT Staking Pool
                </CardTitle>
                <CardDescription>Reward emission parameters</CardDescription>
              </div>
              {config && (
                <Badge variant={config.isPaused ? "destructive" : "default"}>
                  {config.isPaused ? "Paused" : "Active"}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : config ? (
              <form onSubmit={handleSave} className="space-y-4">
                {msg && (
                  <div className="rounded border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-xs font-medium text-emerald-600">
                    {msg}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="nraRewardPerBlock">
                      NRA Reward / Block
                    </Label>
                    <Input
                      id="nraRewardPerBlock"
                      value={config.nraRewardPerBlock}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          nraRewardPerBlock: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="usdtMatchRatio">USDT Match Ratio</Label>
                    <Input
                      id="usdtMatchRatio"
                      value={config.usdtMatchRatio}
                      onChange={(e) =>
                        setConfig({ ...config, usdtMatchRatio: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lockupDurationDays">
                      Lockup Duration (Days)
                    </Label>
                    <Input
                      id="lockupDurationDays"
                      type="number"
                      value={config.lockupDurationDays}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          lockupDurationDays: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rewardMultiplier">
                      Rank Bonus Multiplier
                    </Label>
                    <Input
                      id="rewardMultiplier"
                      value={config.rewardMultiplierRankBonus}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          rewardMultiplierRankBonus: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isPausedStaking"
                      checked={config.isPaused}
                      onCheckedChange={(checked) =>
                        setConfig({ ...config, isPaused: checked })
                      }
                    />
                    <Label
                      htmlFor="isPausedStaking"
                      className="cursor-pointer text-xs"
                    >
                      Pause Staking Emissions
                    </Label>
                  </div>
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving ? "Saving..." : "Save Configuration"}
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-muted-foreground text-xs">
                Could not load staking pool configuration.
              </p>
            )}
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
