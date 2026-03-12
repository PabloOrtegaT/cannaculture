import type { ColumnDef, Row } from "@tanstack/react-table";
import { formatCurrencyCents, formatDateTimeLabel, numericSort, textSort } from "./format";
import type {
  AdminContentRow,
  AdminCouponRow,
  AdminOrderRow,
  AdminProductRow,
  AdminVariantRow,
  CsvImportRowError,
} from "./types";

function numberColumnSort<TData>(rowA: Row<TData>, rowB: Row<TData>, columnId: string) {
  return numericSort(rowA.getValue<number>(columnId), rowB.getValue<number>(columnId));
}

function textColumnSort<TData>(rowA: Row<TData>, rowB: Row<TData>, columnId: string) {
  return textSort(rowA.getValue<string>(columnId), rowB.getValue<string>(columnId));
}

export const productColumns: ColumnDef<AdminProductRow>[] = [
  {
    accessorKey: "name",
    header: "Product",
    sortingFn: textColumnSort,
  },
  {
    accessorKey: "categoryName",
    header: "Category",
    sortingFn: textColumnSort,
  },
  {
    accessorKey: "priceCents",
    header: "Price",
    sortingFn: numberColumnSort,
    cell: ({ getValue, row }) => formatCurrencyCents(getValue<number>(), row.original.currency),
  },
  {
    accessorKey: "stockOnHand",
    header: "Stock",
    sortingFn: numberColumnSort,
  },
  {
    accessorKey: "status",
    header: "Status",
    sortingFn: textColumnSort,
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    sortingFn: textColumnSort,
    cell: ({ getValue }) => formatDateTimeLabel(getValue<string>()),
  },
];

export const variantColumns: ColumnDef<AdminVariantRow>[] = [
  {
    accessorKey: "productName",
    header: "Product",
    sortingFn: textColumnSort,
  },
  {
    accessorKey: "name",
    header: "Variant",
    sortingFn: textColumnSort,
  },
  {
    accessorKey: "sku",
    header: "SKU",
    sortingFn: textColumnSort,
  },
  {
    accessorKey: "priceCents",
    header: "Price",
    sortingFn: numberColumnSort,
    cell: ({ getValue, row }) => formatCurrencyCents(getValue<number>(), row.original.currency),
  },
  {
    accessorKey: "stockOnHand",
    header: "Stock",
    sortingFn: numberColumnSort,
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    sortingFn: textColumnSort,
    cell: ({ getValue }) => formatDateTimeLabel(getValue<string>()),
  },
];

export const orderColumns: ColumnDef<AdminOrderRow>[] = [
  {
    accessorKey: "orderNumber",
    header: "Order",
    sortingFn: textColumnSort,
  },
  {
    accessorKey: "status",
    header: "Status",
    sortingFn: textColumnSort,
  },
  {
    accessorKey: "totalCents",
    header: "Total",
    sortingFn: numberColumnSort,
    cell: ({ getValue, row }) => formatCurrencyCents(getValue<number>(), row.original.currency),
  },
  {
    accessorKey: "itemCount",
    header: "Items",
    sortingFn: numberColumnSort,
  },
  {
    accessorKey: "productLabel",
    header: "Top item",
    sortingFn: textColumnSort,
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    sortingFn: textColumnSort,
    cell: ({ getValue }) => formatDateTimeLabel(getValue<string>()),
  },
];

export const couponColumns: ColumnDef<AdminCouponRow>[] = [
  {
    accessorKey: "code",
    header: "Code",
    sortingFn: textColumnSort,
  },
  {
    accessorKey: "type",
    header: "Type",
    sortingFn: textColumnSort,
  },
  {
    accessorKey: "valueLabel",
    header: "Discount",
    sortingFn: textColumnSort,
  },
  {
    accessorKey: "usageCount",
    header: "Used",
    sortingFn: numberColumnSort,
  },
  {
    accessorKey: "isActive",
    header: "Active",
    sortingFn: (rowA, rowB, columnId) =>
      numericSort(Number(rowA.getValue<boolean>(columnId)), Number(rowB.getValue<boolean>(columnId))),
    cell: ({ getValue }) => (getValue<boolean>() ? "Yes" : "No"),
  },
  {
    accessorKey: "endsAt",
    header: "Ends",
    sortingFn: textColumnSort,
    cell: ({ getValue }) => formatDateTimeLabel(getValue<string>()),
  },
];

export const contentColumns: ColumnDef<AdminContentRow>[] = [
  {
    accessorKey: "type",
    header: "Type",
    sortingFn: textColumnSort,
  },
  {
    accessorKey: "title",
    header: "Title",
    sortingFn: textColumnSort,
  },
  {
    accessorKey: "status",
    header: "Status",
    sortingFn: textColumnSort,
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    sortingFn: textColumnSort,
    cell: ({ getValue }) => formatDateTimeLabel(getValue<string>()),
  },
];

export const csvErrorColumns: ColumnDef<CsvImportRowError>[] = [
  {
    accessorKey: "rowNumber",
    header: "Row",
    sortingFn: numberColumnSort,
  },
  {
    accessorKey: "reason",
    header: "Error",
    sortingFn: textColumnSort,
  },
  {
    accessorFn: (entry) => (entry.rowValues ? Object.entries(entry.rowValues).map(([key, value]) => `${key}=${value}`).join(", ") : "N/A"),
    id: "rowValues",
    header: "Raw values",
    sortingFn: textColumnSort,
  },
];
