import type {
  CategoryTemplateKey,
  CouponType,
  Currency,
  ProductStatus,
} from "@base-ecommerce/domain";

export type AdminProductRow = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  categoryId: string;
  baseSku: string;
  status: ProductStatus;
  categoryName: string;
  categorySlug: string;
  priceCents: number;
  compareAtPriceCents?: number;
  tags: string[];
  currency: Currency;
  stockOnHand: number;
  variantCount: number;
  updatedAt: string;
};

export type AdminCategoryRow = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  templateKey: CategoryTemplateKey;
  attributeCount: number;
};

export type AdminVariantRow = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  name: string;
  priceCents: number;
  compareAtPriceCents?: number;
  currency: Currency;
  stockOnHand: number;
  isDefault: boolean;
  attributeValues: Record<string, string | number | boolean>;
  updatedAt: string;
};

export type AdminOrderStatus =
  | "pending"
  | "pending_payment"
  | "paid"
  | "payment_failed"
  | "shipped"
  | "cancelled";

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
