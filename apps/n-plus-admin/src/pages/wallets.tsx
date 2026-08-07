import { useEffect, useState } from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table"
import { Search } from "lucide-react"

import { Main } from "@/components/layout/main"
import { DataTablePagination } from "@/components/data-table/pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { WalletAddressCell } from "@/components/web3"
import { API_BASE_URL } from "@/config/api.config"
import { type AccountStatus } from "@/types/domain"

type WalletItem = {
  id: string
  walletAddress: string
  chain: string
  status: AccountStatus
  positionsCount: number
  connectedAt: string
  lastLoginAt: string
}

type WalletsResponse = {
  wallets: WalletItem[]
  total: number
}

export default function WalletsPage() {
  const [data, setData] = useState<WalletItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState("")

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/admin/wallets`)
      .then((res) => res.json())
      .then((res: WalletsResponse) => {
        setData(res.wallets || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleToggleStatus = async (
    walletId: string,
    currentStatus: AccountStatus,
  ) => {
    const nextStatus: AccountStatus =
      currentStatus === "Active" ? "Locked" : "Active"
    setUpdatingId(walletId)
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/wallets/${walletId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      const json = await res.json()
      if (res.ok && json.wallet) {
        setData((prev) =>
          prev.map((w) =>
            w.id === walletId ? { ...w, status: json.wallet.status } : w,
          ),
        )
      }
    } catch {
      setData((prev) =>
        prev.map((w) => (w.id === walletId ? { ...w, status: nextStatus } : w)),
      )
    } finally {
      setUpdatingId(null)
    }
  }

  const columns: ColumnDef<WalletItem>[] = [
    {
      accessorKey: "walletAddress",
      header: "Wallet Address",
      cell: ({ row }) => (
        <WalletAddressCell address={row.original.walletAddress} />
      ),
    },
    {
      accessorKey: "chain",
      header: "Chain",
      cell: ({ row }) => <span className="">{row.getValue("chain")}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue<AccountStatus>("status")
        return (
          <Badge variant={status === "Active" ? "outline" : "destructive"}>
            {status}
          </Badge>
        )
      },
    },
    {
      accessorKey: "positionsCount",
      header: () => <div className="text-right">Attached Positions</div>,
      cell: ({ row }) => (
        <div className="text-right font-bold">
          {row.getValue("positionsCount")}
        </div>
      ),
    },
    {
      accessorKey: "connectedAt",
      header: "Connected Date",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {new Date(row.getValue<string>("connectedAt")).toLocaleDateString()}
        </span>
      ),
    },
    {
      accessorKey: "lastLoginAt",
      header: "Last Login",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {new Date(row.getValue<string>("lastLoginAt")).toLocaleString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const wallet = row.original
        return (
          <div className="text-right">
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              disabled={updatingId === wallet.id}
              onClick={() => handleToggleStatus(wallet.id, wallet.status)}
            >
              {updatingId === wallet.id
                ? "Updating..."
                : wallet.status === "Active"
                  ? "Lock"
                  : "Unlock"}
            </Button>
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <>
      <Main fixed className="flex flex-1 flex-col gap-4 sm:gap-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Wallet Directory
            </h1>
            <p className="text-muted-foreground">
              Registered wallet accounts, connected chain, status, and
              associated positions.
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:max-w-64">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              type="search"
              placeholder="Filter wallets..."
              className="h-8 pl-8"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="pl-4 first:pl-4 last:pr-4"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((_, j) => (
                      <TableCell key={j} className="pl-4 first:pl-4 last:pr-4">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-muted-foreground h-24 text-center"
                  >
                    No wallets found.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="pl-4 first:pl-4 last:pr-4"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <DataTablePagination table={table} className="mt-auto" />
      </Main>
    </>
  )
}
