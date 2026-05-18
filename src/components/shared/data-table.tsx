"use client"

import * as React from "react"
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  totalItems: number
  page: number
  limit: number
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  onSort?: (field: string, direction: "asc" | "desc") => void
  isLoading?: boolean
  onRowClick?: (row: T) => void
  selectable?: boolean
  onSelect?: (selected: T[]) => void
  emptyMessage?: string
}

const PAGE_SIZES = [10, 25, 50, 100]

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  totalItems,
  page,
  limit,
  onPageChange,
  onLimitChange,
  onSort,
  isLoading = false,
  onRowClick,
  selectable = false,
  onSelect,
  emptyMessage = "No results found.",
}: DataTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({})

  const totalPages = Math.ceil(totalItems / limit)

  const allColumns = React.useMemo(() => {
    const cols: ColumnDef<T>[] = []
    if (selectable) {
      cols.push({
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => {
              table.toggleAllPageRowsSelected(!!value)
            }}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
      })
    }
    return [...cols, ...columns]
  }, [columns, selectable])

  const table = useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      rowSelection,
    },
    manualPagination: true,
    manualSorting: true,
    pageCount: totalPages,
  })

  React.useEffect(() => {
    if (onSelect) {
      const selectedRows = table.getFilteredSelectedRowModel().rows.map((r) => r.original)
      onSelect(selectedRows)
    }
  }, [rowSelection, onSelect, table])

  const handleSort = (field: string) => {
    const current = sorting.find((s) => s.id === field)
    const newDirection = current?.desc ? "asc" : "desc"
    setSorting([{ id: field, desc: newDirection === "desc" }])
    onSort?.(field, newDirection)
  }

  const selectedCount = table.getFilteredSelectedRowModel().rows.length

  // Skeleton loading rows
  const skeletonRows = React.useMemo(
    () =>
      Array.from({ length: Math.min(limit, 5) }).map((_, i) => i),
    [limit]
  )

  return (
    <div className="space-y-4">
      {/* Bulk action bar */}
      {selectable && selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-accent/50 border rounded-lg px-4 py-2 flex items-center gap-2 text-sm"
        >
          <span className="font-medium text-accent-foreground">
            {selectedCount} selected
          </span>
        </motion.div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}>
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={() => handleSort(header.column.id)}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorting.find((s) => s.id === header.column.id) ? (
                          sorting.find((s) => s.id === header.column.id)?.desc ? (
                            <ArrowDown className="size-3.5" />
                          ) : (
                            <ArrowUp className="size-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3.5 opacity-40" />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              skeletonRows.map((i) => (
                <TableRow key={i}>
                  {allColumns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(onRowClick && "cursor-pointer")}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={allColumns.length} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <span className="text-lg">{emptyMessage}</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          skeletonRows.map((i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))
        ) : data.length > 0 ? (
          <AnimatePresence>
            {data.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card
                  className={cn(onRowClick && "cursor-pointer hover:shadow-md transition-shadow")}
                  onClick={() => onRowClick?.(item)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {selectable && (
                        <Checkbox
                          checked={!!rowSelection[String(idx)]}
                          onCheckedChange={(value) => {
                            setRowSelection((prev) => ({
                              ...prev,
                              [String(idx)]: !!value,
                            }))
                          }}
                          aria-label="Select row"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      <div className="flex-1 space-y-1">
                        {columns.map((col) => {
                          const accessorKey = (col as { accessorKey?: string }).accessorKey
                          if (!accessorKey) return null
                          const headerStr =
                            typeof col.header === "string"
                              ? col.header
                              : accessorKey
                          const value = item[accessorKey]
                          return (
                            <div key={accessorKey} className="flex justify-between text-sm">
                              <span className="text-muted-foreground capitalize">
                                {headerStr.replace(/([A-Z])/g, " $1").trim()}
                              </span>
                              <span className="font-medium">{String(value ?? "-")}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <span className="text-lg">{emptyMessage}</span>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {selectable && <span>{selectedCount} of {totalItems} selected</span>}
            {!selectable && (
              <span>
                Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, totalItems)} of {totalItems}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows</span>
              <Select
                value={String(limit)}
                onValueChange={(val) => onLimitChange(Number(val))}
              >
                <SelectTrigger className="h-8 w-[70px]" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => onPageChange(1)}
                disabled={page <= 1}
              >
                <ChevronsLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-sm px-2 min-w-[80px] text-center">
                {page} / {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => onPageChange(totalPages)}
                disabled={page >= totalPages}
              >
                <ChevronsRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
