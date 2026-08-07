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

type Member = {
  id: string
  walletAddress: string
  email: string
  personalRank: PersonalRank
  teamRank: TeamRank
  directReferrals: number
  teamVolumeUsdt: string
  joinedAt: string
}

type MembersResponse = {
  members: Member[]
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

const columns: ColumnDef<Member>[] = [
  {
    accessorKey: "walletAddress",
    header: "Wallet Address",
    cell: ({ row }) => (
      <WalletAddressCell address={row.original.walletAddress} />
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => <span className="">{row.getValue("email")}</span>,
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
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("teamRank")}</span>
    ),
  },
  {
    accessorKey: "directReferrals",
    header: () => <div className="text-right">Direct Referrals</div>,
    cell: ({ row }) => (
      <div className="text-right">{row.getValue("directReferrals")}</div>
    ),
  },
  {
    accessorKey: "teamVolumeUsdt",
    header: () => <div className="text-right">Team Volume (USDT)</div>,
    cell: ({ row }) => (
      <div className="text-right font-mono">
        ${row.getValue("teamVolumeUsdt")}
      </div>
    ),
  },
  {
    accessorKey: "joinedAt",
    header: "Joined At",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {new Date(row.getValue<string>("joinedAt")).toLocaleDateString()}
      </span>
    ),
  },
]

export default function MembersPage() {
  const [data, setData] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState("")

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/admin/members`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load MLM members.")
        return res.json()
      })
      .then((res: MembersResponse) => {
        setData(res.members || [])
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Error fetching members.")
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
              Organisation Members
            </h1>
            <p className="text-muted-foreground">
              Manage MLM unilevel members, personal rank, team rank, and
              volumes.
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
              placeholder="Filter members..."
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
                    No members found.
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

        {/* Sticky pagination */}
        <DataTablePagination table={table} className="mt-auto" />
      </Main>
    </>
  )
}
