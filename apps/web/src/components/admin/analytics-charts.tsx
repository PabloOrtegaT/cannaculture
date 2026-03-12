"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { OrderStatusPoint, SalesTrendPoint, TopProductPoint } from "@/features/admin/types";
import { formatCurrencyCents } from "@/features/admin/format";

type AnalyticsChartsProps = {
  salesTrend: SalesTrendPoint[];
  topProducts: TopProductPoint[];
  orderStatus: OrderStatusPoint[];
};

function currencyTooltipFormatter(value: unknown) {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numericValue)) {
    return String(value ?? "");
  }
  return formatCurrencyCents(numericValue, "MXN");
}

export function AnalyticsCharts({ salesTrend, topProducts, orderStatus }: AnalyticsChartsProps) {
  const [hasMounted, setHasMounted] = React.useState(false);

  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border bg-card p-4 text-card-foreground">
          <h2 className="mb-3 text-sm font-semibold">Sales trend</h2>
          <div className="h-56 rounded-md border border-dashed bg-muted" />
        </section>
        <section className="rounded-lg border bg-card p-4 text-card-foreground">
          <h2 className="mb-3 text-sm font-semibold">Top products</h2>
          <div className="h-56 rounded-md border border-dashed bg-muted" />
        </section>
        <section className="rounded-lg border bg-card p-4 text-card-foreground">
          <h2 className="mb-3 text-sm font-semibold">Order status distribution</h2>
          <div className="h-56 rounded-md border border-dashed bg-muted" />
        </section>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="rounded-lg border bg-card p-4 text-card-foreground">
        <h2 className="mb-3 text-sm font-semibold">Sales trend</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => currencyTooltipFormatter(value)} />
              <Line type="monotone" dataKey="totalCents" stroke="var(--primary)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4 text-card-foreground">
        <h2 className="mb-3 text-sm font-semibold">Top products</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topProducts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => currencyTooltipFormatter(value)} />
              <Bar dataKey="revenueCents" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4 text-card-foreground">
        <h2 className="mb-3 text-sm font-semibold">Order status distribution</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={orderStatus} dataKey="count" nameKey="status" outerRadius={82} fill="var(--primary)" />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
