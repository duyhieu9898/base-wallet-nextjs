"use client"

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn, getPageNumbers } from "@/lib/utils"

type DataTablePaginationProps = {
  page?: number
  currentPage?: number
  pageSize: number
  totalItems?: number
  total?: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  className?: string
}

export function DataTablePagination({
  page,
  currentPage: inputCurrentPage,
  pageSize,
  totalItems,
  total: inputTotal,
  onPageChange,
  onPageSizeChange,
  className,
}: DataTablePaginationProps) {
  const activePage = page ?? inputCurrentPage ?? 1
  const activeTotal = totalItems ?? inputTotal ?? 0
  const totalPages = Math.max(1, Math.ceil(activeTotal / pageSize))
  const pageNumbers = getPageNumbers(activePage, totalPages)

  const canPreviousPage = activePage > 1
  const canNextPage = activePage < totalPages

  return (
    <div
      className={cn(
        "flex items-center justify-between overflow-clip px-2",
        "@max-2xl/content:flex-col-reverse @max-2xl/content:gap-4",
        className,
      )}
      style={{ overflowClipMargin: 1 }}
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex w-25 items-center justify-center text-sm font-medium @2xl/content:hidden">
          Page {activePage} of {totalPages}
        </div>
        <div className="flex items-center gap-2 @max-2xl/content:flex-row-reverse">
          <Select
            value={`${pageSize}`}
            onValueChange={(val) => onPageSizeChange(Number(val))}
          >
            <SelectTrigger className="h-8 w-17.5">
              <SelectValue placeholder={`${pageSize}`} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="hidden text-sm font-medium sm:block">Rows per page</p>
        </div>
      </div>

      <div className="flex items-center sm:space-x-6 lg:space-x-8">
        <div className="flex w-25 items-center justify-center text-sm font-medium @max-3xl/content:hidden">
          Page {activePage} of {totalPages}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="size-8 p-0 @max-md/content:hidden"
            onClick={() => onPageChange(1)}
            disabled={!canPreviousPage}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="size-8 p-0"
            onClick={() => onPageChange(activePage - 1)}
            disabled={!canPreviousPage}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {pageNumbers.map((pageNumber, index) => (
            <div key={`${pageNumber}-${index}`} className="flex items-center">
              {pageNumber === "..." ? (
                <span className="text-muted-foreground px-1 text-sm">...</span>
              ) : (
                <Button
                  variant={activePage === pageNumber ? "default" : "outline"}
                  className="h-8 min-w-8 px-2"
                  onClick={() => onPageChange(pageNumber as number)}
                >
                  <span className="sr-only">Go to page {pageNumber}</span>
                  {pageNumber}
                </Button>
              )}
            </div>
          ))}

          <Button
            variant="outline"
            className="size-8 p-0"
            onClick={() => onPageChange(activePage + 1)}
            disabled={!canNextPage}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="size-8 p-0 @max-md/content:hidden"
            onClick={() => onPageChange(totalPages)}
            disabled={!canNextPage}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
