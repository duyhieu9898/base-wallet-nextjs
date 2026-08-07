"use client"

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

import { TransactionHashCell } from "@/components/web3"
import { API_BASE_URL } from "@/config/api.config"
import { type SyncStatus } from "@/types/domain"

type TransactionItem = {
  id: string
  txHash: string
  chain: string
  sourceType: string
  positionReferralCode: string
  type: string
  amount: string
  status: SyncStatus
  occurredAt: string
}

type HistoryResponse = {
  transactions: TransactionItem[]
  total: number
}

const columns: ColumnDef<TransactionItem>[] = [
  {
    accessorKey: "txHash",
    header: "Tx Hash",
    cell: ({ row }) => <TransactionHashCell hash={row.original.txHash} />,
  },
  {
    accessorKey: "chain",
    header: "Chain",
    cell: ({ row }) => <span className="">{row.getValue("chain")}</span>,
  },
  {
    accessorKey: "sourceType",
    header: "Source Event",
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("sourceType")}</span>
    ),
  },
  {
    accessorKey: "positionReferralCode",
    header: "Position",
    cell: ({ row }) => (
      <span className="font-mono">{row.getValue("positionReferralCode")}</span>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => <span className="">{row.getValue("type")}</span>,
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => (
      <div className="text-right font-mono font-bold">
        {row.getValue("amount")}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Sync Status",
    cell: ({ row }) => {
      const status = row.getValue<SyncStatus>("status")
      return (
        <Badge variant={status === "Synced" ? "outline" : "secondary"}>
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: "occurredAt",
    header: "Occurred At",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {new Date(row.getValue<string>("occurredAt")).toLocaleString()}
      </span>
    ),
  },
]

export default function HistoryPage() {
  const [data, setData] = useState<TransactionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState("")

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/admin/history`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load blockchain transactions.")
        return res.json()
      })
      .then((res: HistoryResponse) => {
        setData(res.transactions || [])
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Error fetching history.")
        setLoading(false)
      })
  }, [])

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
              System Transaction History
            </h1>
            <p className="text-muted-foreground">
              Blockchain transaction audit log, sync status, and event sources.
            </p>
          </div>
        </div>

        {error && (
          <div className="text-destructive bg-destructive/10 border-destructive/20 rounded border p-3 font-medium">
            {error}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:max-w-64">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              type="search"
              placeholder="Filter by tx hash or code..."
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
                    No transactions found.
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
