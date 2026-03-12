import { describe, expect, it } from "vitest";
import { formatCurrencyCents } from "@/features/admin/format";
import { couponColumns, productColumns } from "@/features/admin/table-columns";

function fakeRow(value: unknown) {
  return {
    getValue: () => value,
  } as {
    getValue: () => unknown;
  };
}

function getProductPriceSort() {
  return productColumns.find((column) => "accessorKey" in column && column.accessorKey === "priceCents")?.sortingFn;
}

describe("admin table column definitions", () => {
  it("formats currency values for price cells", () => {
    expect(formatCurrencyCents(19900, "MXN")).toContain("199.00");
  });

  it("sorts product price column numerically", () => {
    const sortingFn = getProductPriceSort();
    expect(typeof sortingFn).toBe("function");

    const left = fakeRow(100);
    const right = fakeRow(300);
    expect(
      (sortingFn as unknown as (a: { getValue: () => unknown }, b: { getValue: () => unknown }, id: string) => number)(
        left,
        right,
        "priceCents",
      ),
    ).toBeLessThan(0);
  });

  it("renders coupon active state as yes/no and supports sorting", () => {
    const activeColumn = couponColumns.find((column) => "accessorKey" in column && column.accessorKey === "isActive");
    expect(activeColumn).toBeDefined();
    const sortingFn = activeColumn?.sortingFn;
    expect(typeof sortingFn).toBe("function");

    const left = fakeRow(false);
    const right = fakeRow(true);
    expect(
      (sortingFn as unknown as (a: { getValue: () => unknown }, b: { getValue: () => unknown }, id: string) => number)(
        left,
        right,
        "isActive",
      ),
    ).toBeLessThan(0);
  });
});
