"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import {
  contentColumns,
  couponColumns,
  csvErrorColumns,
  orderColumns,
  productColumns,
  variantColumns,
} from "@/features/admin/table-columns";
import type {
  AdminContentRow,
  AdminCouponRow,
  AdminOrderRow,
  AdminProductRow,
  AdminVariantRow,
  CsvImportRowError,
} from "@/features/admin/types";
import { DataTable } from "./data-table";

const productActionColumn: ColumnDef<AdminProductRow> = {
  id: "actions",
  header: "Actions",
  cell: ({ row }) => (
    <Link href={`/admin/products?editProduct=${row.original.id}`} className="text-primary hover:underline">
      Edit
    </Link>
  ),
};

const variantActionColumn: ColumnDef<AdminVariantRow> = {
  id: "actions",
  header: "Actions",
  cell: ({ row }) => (
    <Link href={`/admin/products?editVariant=${row.original.id}`} className="text-primary hover:underline">
      Edit
    </Link>
  ),
};

export function ProductsTable({ rows }: { rows: AdminProductRow[] }) {
  const columns = React.useMemo(() => [...productColumns, productActionColumn], []);
  return <DataTable columns={columns} data={rows} emptyLabel="No products available." />;
}

export function VariantsTable({ rows }: { rows: AdminVariantRow[] }) {
  const columns = React.useMemo(() => [...variantColumns, variantActionColumn], []);
  return <DataTable columns={columns} data={rows} emptyLabel="No variants available." />;
}

export function OrdersTable({ rows }: { rows: AdminOrderRow[] }) {
  return <DataTable columns={orderColumns} data={rows} emptyLabel="No orders yet." />;
}

export function CouponsTable({ rows }: { rows: AdminCouponRow[] }) {
  return <DataTable columns={couponColumns} data={rows} emptyLabel="No coupons configured." />;
}

export function ContentTable({ rows }: { rows: AdminContentRow[] }) {
  return <DataTable columns={contentColumns} data={rows} emptyLabel="No content entries available." />;
}

export function CsvErrorsTable({ rows }: { rows: CsvImportRowError[] }) {
  return <DataTable columns={csvErrorColumns} data={rows} emptyLabel="No row errors." />;
}
