import { useCallback, useEffect, useState } from "react"
import { Download, Network, RotateCcw, Search } from "lucide-react"

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
import { Skeleton } from "@/components/ui/skeleton"
import { WalletAddressCell } from "@/components/web3"
import {
  fetchOrganizationRoot,
  OrganizationTree,
  type OrganizationRootResponse,
} from "@/features/mlm/organization-tree"

export default function RanksPage() {
  const [root, setRoot] = useState<OrganizationRootResponse | null>(null)
  const [search, setSearch] = useState("")
  const [activeQuery, setActiveQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Marking the lookup busy belongs to the event that starts it, not to the
  // effect that serves it: setting state synchronously from an effect body
  // cascades an extra render, and this is the only place a lookup begins.
  const handleSearch = useCallback((query: string) => {
    setSearch(query)
    setActiveQuery(query)
    setLoading(true)
    setError(null)
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    fetchOrganizationRoot(activeQuery, controller.signal)
      .then((data) => {
        setRoot(data)
        setLoading(false)
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        // The spec keeps the current tree on a failed lookup, so `root` is left
        // as it is rather than cleared.
        setError(cause instanceof Error ? cause.message : "Position not found.")
        setLoading(false)
      })

    return () => controller.abort()
  }, [activeQuery])

  const handleExportData = () => {
    if (!root) return
    const exportPayload = { root, exportedAt: new Date().toISOString() }
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(exportPayload, null, 2))
    const downloadAnchor = document.createElement("a")
    downloadAnchor.setAttribute("href", dataStr)
    downloadAnchor.setAttribute(
      "download",
      `unilevel-tree-${root.referralCode}.json`,
    )
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  return (
    <>
      <Main>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              System Organization Map (Unilevel Tree)
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Inspect position hierarchy, depth levels, and unilevel team
              structures.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeQuery && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => handleSearch("")}
              >
                <RotateCcw className="h-4 w-4" /> Back to System Root
              </Button>
            )}
            <Button
              size="sm"
              variant="default"
              className="gap-1.5"
              onClick={handleExportData}
              disabled={!root}
            >
              <Download className="h-4 w-4" /> Export Data
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-6 flex max-w-md gap-2">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              type="search"
              placeholder="Search by Referral Code or Wallet..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch(search)}
            />
          </div>
          <Button onClick={() => handleSearch(search)}>Search</Button>
        </div>

        {error && (
          <p className="text-destructive mt-3 text-sm font-medium">{error}</p>
        )}

        {/*
          Summary above, map below — each on its own row.
          The map is the widest thing on the screen and its height changes every
          time a branch opens; sharing a grid row with the summary would both
          starve it of width and stretch the summary card to match.
        */}
        <div className="mt-6 space-y-6">
          {/* Root Position Summary — laid out horizontally so a full-width row
              costs only one band of vertical space. */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Network className="h-4 w-4" /> Position Summary
              </CardTitle>
              <CardDescription>
                {activeQuery
                  ? `Subtree Gốc: ${root?.referralCode}`
                  : "System Root Node"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-12 w-full" />
              ) : root ? (
                <dl className="flex flex-wrap items-start gap-x-10 gap-y-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Referral Code</dt>
                    <dd className="font-mono text-sm font-bold">
                      {root.referralCode}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Wallet Address</dt>
                    <dd>
                      <WalletAddressCell
                        address={root.walletAddress}
                        className="text-sm"
                      />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Subtree Size</dt>
                    <dd className="text-sm font-bold">
                      {root.descendantCount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Max Depth</dt>
                    <dd className="text-sm font-bold">{root.maxDepth}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Is Root</dt>
                    <dd>
                      <Badge variant={root.isRoot ? "default" : "outline"}>
                        {root.isRoot ? "Yes" : "No"}
                      </Badge>
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No position selected.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tree View */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Unilevel Descendant Hierarchy
              </CardTitle>
              <CardDescription>
                {/*
                  Says out loud that the view is loaded one level at a time.
                  Without it, "Max Depth 5" next to a two-row tree reads as a bug:
                  the stat describes the whole subtree, the tree shows only what
                  has been expanded, and nothing on screen said so.
                */}
                {root && root.maxDepth > 0
                  ? `Loads one level at a time — this subtree is ${root.maxDepth} ${
                      root.maxDepth === 1 ? "level" : "levels"
                    } deep. Expand a node to load the next one, or click any Referral Code to re-root the map there.`
                  : "Expand a node to load its downlines. Click any Referral Code to re-root the map there."}
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-50">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : root ? (
                <OrganizationTree root={root} onSelectNode={handleSearch} />
              ) : (
                <p className="text-muted-foreground py-4 text-sm">
                  No position selected.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
