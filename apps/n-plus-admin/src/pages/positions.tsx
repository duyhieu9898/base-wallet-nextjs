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

import { WalletAddressCell } from "@/components/web3"
import { API_BASE_URL } from "@/config/api.config"
import { type PersonalRank, type TeamRank } from "@/types/domain"

type PositionItem = {
  id: string
  positionIndex: number
  referralCode: string
  walletAddress: string
  personalRank: PersonalRank
  teamRank: TeamRank
  status: string
  withdrawalCapUsdt: string
  joinedAt: string
}

type PositionsResponse = {
  positions: PositionItem[]
  total: number
}

function getRankBadgeVariant(
  rank: string,
): "default" | "secondary" | "outline" {
  switch (rank.toLowerCase()) {
    case "gold":
      return "default"
    case "silver":
      return "secondary"
    default:
      return "outline"
  }
}

const columns: ColumnDef<PositionItem>[] = [
  {
    accessorKey: "referralCode",
    header: "Referral Code",
    cell: ({ row }) => (
      <span className="font-mono font-bold">
        {row.getValue("referralCode")}
      </span>
    ),
  },
  {
    accessorKey: "walletAddress",
    header: "Wallet Address",
    cell: ({ row }) => (
      <WalletAddressCell address={row.original.walletAddress} />
    ),
  },
  {
    accessorKey: "positionIndex",
    header: "Seat Index",
    cell: ({ row }) => (
      <span className="">Seat #{row.getValue("positionIndex")}</span>
    ),
  },
  {
    accessorKey: "personalRank",
    header: "Personal Rank",
    cell: ({ row }) => (
      <Badge variant={getRankBadgeVariant(row.getValue("personalRank"))}>
        {row.getValue("personalRank")}
      </Badge>
    ),
  },
  {
    accessorKey: "teamRank",
    header: "Team Rank",
    cell: ({ row }) => <span className="">{row.getValue("teamRank")}</span>,
  },
  {
    accessorKey: "withdrawalCapUsdt",
    header: () => <div className="text-right">Withdrawal Cap (USDT)</div>,
    cell: ({ row }) => (
      <div className="text-right font-mono">
        ${row.getValue("withdrawalCapUsdt")}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue<string>("status")
      return (
        <Badge variant={status === "Active" ? "outline" : "destructive"}>
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: "joinedAt",
    header: "Joined Date",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {new Date(row.getValue<string>("joinedAt")).toLocaleDateString()}
      </span>
    ),
  },
]

export default function PositionsPage() {
  const [data, setData] = useState<PositionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState("")

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/admin/positions`)
      .then((res) => res.json())
      .then((res: PositionsResponse) => {
        setData(res.positions || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
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
              Position Directory
            </h1>
            <p className="text-muted-foreground">
              All member seats/positions in the system, rank status, and
              withdrawal caps.
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:max-w-64">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              type="search"
              placeholder="Filter by referral code or wallet..."
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
                    No positions found.
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
