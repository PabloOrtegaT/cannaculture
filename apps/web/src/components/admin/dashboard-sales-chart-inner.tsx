"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SalesTrendPoint } from "@/features/admin/types";
import { formatCurrencyCents } from "@/features/admin/format";
import type { Currency } from "@cannaculture/domain";

export type DashboardSalesTrendChartProps = {
  salesTrend: SalesTrendPoint[];
  currency: Currency;
};

function tooltipFormatter(value: unknown, currency: Currency) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isNaN(n) ? String(value ?? "") : formatCurrencyCents(n, currency);
}

export function DashboardSalesTrendChart({ salesTrend, currency }: DashboardSalesTrendChartProps) {
  const hasMounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold mb-4">Sales Trend</h2>
      <div className="h-52">
        {!hasMounted ? (
          <div className="h-full rounded-md border border-dashed bg-muted" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesTrend}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => tooltipFormatter(v, currency)} />
              <Area
                type="monotone"
                dataKey="totalCents"
                stroke="var(--primary)"
                strokeWidth={2}
                fill="url(#salesGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
