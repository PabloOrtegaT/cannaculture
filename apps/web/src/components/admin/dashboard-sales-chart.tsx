import dynamic from "next/dynamic";
import type { DashboardSalesTrendChartProps } from "./dashboard-sales-chart-inner";

export const DashboardSalesTrendChart = dynamic(
  () => import("./dashboard-sales-chart-inner").then((mod) => mod.DashboardSalesTrendChart),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold mb-4">Sales Trend</h2>
        <div className="h-52 rounded-md border border-dashed bg-muted animate-pulse" />
      </div>
    ),
  },
);

export type { DashboardSalesTrendChartProps };
