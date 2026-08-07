import { useEffect, useState } from "react"
import { Vault } from "lucide-react"

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

type LendingPoolConfig = {
  asset: string
  collateralFactor: string
  liquidationThreshold: string
  liquidationBonus: string
  baseBorrowRate: string
  isPaused: boolean
}

export default function LendingPage() {
  const [config, setConfig] = useState<LendingPoolConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/admin/pools/lending`)
      .then((res) => res.json())
      .then((data: LendingPoolConfig) => {
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
      const res = await fetch(`${API_BASE_URL}/api/admin/pools/lending`, {
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
              Lending Pool Configuration
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Configure collateral factors, liquidation parameters, and borrow
              rates.
            </p>
          </div>
        </div>

        <Card className="mt-6 max-w-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Vault className="h-4 w-4" /> Asset: {config?.asset ?? "USDT"}
                </CardTitle>
                <CardDescription>Protocol risk parameters</CardDescription>
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
                    <Label htmlFor="collateralFactor">
                      Collateral Factor (LTV)
                    </Label>
                    <Input
                      id="collateralFactor"
                      value={config.collateralFactor}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          collateralFactor: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="liquidationThreshold">
                      Liquidation Threshold
                    </Label>
                    <Input
                      id="liquidationThreshold"
                      value={config.liquidationThreshold}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          liquidationThreshold: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="liquidationBonus">Liquidation Bonus</Label>
                    <Input
                      id="liquidationBonus"
                      value={config.liquidationBonus}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          liquidationBonus: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="baseBorrowRate">Base Borrow Rate</Label>
                    <Input
                      id="baseBorrowRate"
                      value={config.baseBorrowRate}
                      onChange={(e) =>
                        setConfig({ ...config, baseBorrowRate: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isPaused"
                      checked={config.isPaused}
                      onCheckedChange={(checked) =>
                        setConfig({ ...config, isPaused: checked })
                      }
                    />
                    <Label
                      htmlFor="isPaused"
                      className="cursor-pointer text-xs"
                    >
                      Pause Pool (Emergency Guard)
                    </Label>
                  </div>
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving ? "Saving..." : "Save Configuration"}
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-muted-foreground text-xs">
                Could not load lending pool configuration.
              </p>
            )}
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
