"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  type ColumnDef,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PAGE_SIZES = [10, 25, 50] as const;
const ALL = 100000;

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchPlaceholder?: string;
  /** Éléments de filtre additionnels (Select…) rendus dans la barre d'outils. */
  toolbarExtra?: React.ReactNode;
  onRowClick?: (row: TData) => void;
  emptyMessage?: string;
  /** Libellé de pied de tableau, ex. (n) => `${n} membre(s)`. */
  footerLabel?: (count: number) => string;
  /** Active la colonne de sélection (cases à cocher) + barre d'actions groupées. */
  enableSelection?: boolean;
  /** Identifiant stable d'une ligne (recommandé avec la sélection). */
  getRowId?: (row: TData) => string;
  /** Barre d'actions groupées, rendue quand au moins une ligne est sélectionnée. */
  renderBulkActions?: (selected: TData[], clearSelection: () => void) => React.ReactNode;
}

/** Case à cocher gérant l'état « indéterminé » (sélection partielle). */
function RowCheckbox({
  checked,
  indeterminate,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate) && !checked;
  }, [indeterminate, checked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      aria-label={ariaLabel}
      className="size-4 cursor-pointer accent-primary"
    />
  );
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Recherche…",
  toolbarExtra,
  onRowClick,
  emptyMessage = "Aucun résultat.",
  footerLabel,
  enableSelection = false,
  getRowId,
  renderBulkActions,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Colonne de sélection ajoutée en tête lorsque la sélection est active.
  const tableColumns = useMemo<ColumnDef<TData, TValue>[]>(() => {
    if (!enableSelection) return columns;
    const selectColumn: ColumnDef<TData, TValue> = {
      id: "__select",
      enableSorting: false,
      meta: { className: "w-8" },
      header: ({ table }) => (
        <RowCheckbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          ariaLabel="Tout sélectionner"
        />
      ),
      cell: ({ row }) => (
        <RowCheckbox
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          ariaLabel="Sélectionner la ligne"
        />
      ),
    };
    return [selectColumn, ...columns];
  }, [enableSelection, columns]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting, globalFilter, rowSelection, pagination },
    enableRowSelection: enableSelection,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const filteredCount = table.getFilteredRowModel().rows.length;
  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);

  return (
    <div className="space-y-3">
      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-[12.5px] text-text-soft">
          <Select
            value={pagination.pageSize >= ALL ? "Tout" : String(pagination.pageSize)}
            onValueChange={(v) => {
              setPagination({ pageIndex: 0, pageSize: v === "Tout" ? ALL : Number(v) });
            }}
          >
            <SelectTrigger className="h-9 w-[88px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
              <SelectItem value="Tout">Tout</SelectItem>
            </SelectContent>
          </Select>
          <span>lignes</span>
        </div>

        {toolbarExtra}

        <div className="ml-auto flex items-center gap-2">
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 w-[210px]"
            aria-label="Recherche"
          />
        </div>
      </div>

      {/* Barre d'actions groupées */}
      {enableSelection && renderBulkActions && selectedRows.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <span className="text-[12.5px] font-semibold text-primary">
            {selectedRows.length} sélectionné(s)
          </span>
          {renderBulkActions(selectedRows, () => table.resetRowSelection())}
        </div>
      ) : null}

      {/* Tableau */}
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id} className="hover:bg-transparent">
              {hg.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      (header.column.columnDef.meta as { className?: string } | undefined)
                        ?.className,
                      canSort && "cursor-pointer select-none",
                    )}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {canSort ? (
                        sorted === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : sorted === "desc" ? (
                          <ArrowDown className="size-3" />
                        ) : (
                          <ChevronsUpDown className="size-3 opacity-40" />
                        )
                      ) : null}
                    </span>
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                className={onRowClick ? "cursor-pointer" : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={
                      (cell.column.columnDef.meta as { className?: string } | undefined)?.className
                    }
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={tableColumns.length} className="py-8 text-center text-text-soft">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pied + pagination */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-text-faint">
        <span>{footerLabel ? footerLabel(filteredCount) : `${filteredCount} résultat(s)`}</span>
        {table.getPageCount() > 1 ? (
          <div className="flex items-center gap-2">
            <button
              className="rounded-md border border-border px-2.5 py-1 disabled:opacity-40"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Précédent
            </button>
            <span>
              Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </span>
            <button
              className="rounded-md border border-border px-2.5 py-1 disabled:opacity-40"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Suivant
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
