import type { CouponType, Currency, ProductStatus } from "@base-ecommerce/domain";

export type AdminProductRow = {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  categoryName: string;
  categorySlug: string;
  priceCents: number;
  currency: Currency;
  stockOnHand: number;
  variantCount: number;
  updatedAt: string;
};

export type AdminVariantRow = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  name: string;
  priceCents: number;
  currency: Currency;
  stockOnHand: number;
  isDefault: boolean;
  updatedAt: string;
};

export type AdminOrderStatus = "pending" | "paid" | "shipped" | "cancelled";

export type AdminOrderRow = {
  id: string;
  orderNumber: string;
  status: AdminOrderStatus;
  totalCents: number;
  currency: Currency;
  itemCount: number;
  productLabel: string;
  createdAt: string;
};

export type AdminCouponRow = {
  id: string;
  code: string;
  type: CouponType;
  valueLabel: string;
  target: "subtotal";
  isActive: boolean;
  usageLimit?: number;
  usageCount: number;
  startsAt: string;
  endsAt: string;
};

export type AdminContentType = "news" | "banner" | "featured";

export type AdminContentRow = {
  id: string;
  type: AdminContentType;
  title: string;
  status: string;
  startsAt?: string;
  endsAt?: string;
  updatedAt: string;
};

export type SalesTrendPoint = {
  date: string;
  totalCents: number;
};

export type TopProductPoint = {
  name: string;
  revenueCents: number;
};

export type OrderStatusPoint = {
  status: AdminOrderStatus;
  count: number;
};

export type CsvImportRowError = {
  rowNumber: number;
  reason: string;
  rowValues: Record<string, string> | null;
};

export type CsvImportResult = {
  importedProducts: number;
  importedVariants: number;
  errors: CsvImportRowError[];
};
