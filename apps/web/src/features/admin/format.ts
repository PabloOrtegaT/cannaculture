import type { Currency } from "@base-ecommerce/domain";

export function formatCurrencyCents(cents: number, currency: Currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatDateTimeLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function numericSort(left: number, right: number) {
  return left - right;
}

export function textSort(left: string, right: string) {
  return left.localeCompare(right);
}
