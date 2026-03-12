import { couponSchema, type Coupon, type Currency, type StoreProfile } from "@base-ecommerce/domain";
import { getStorefrontSeed, type StorefrontSeed } from "./storefront-db";

export type AdminOrderStatus = "pending" | "paid" | "shipped" | "cancelled";

export type AdminOrder = {
  id: string;
  orderNumber: string;
  status: AdminOrderStatus;
  totalCents: number;
  currency: Currency;
  itemCount: number;
  productLabel: string;
  createdAt: string;
};

export type ProfileRuntimeStore = StorefrontSeed & {
  coupons: Coupon[];
  orders: AdminOrder[];
};

type RuntimeStoreByProfile = Record<StoreProfile, ProfileRuntimeStore>;

const storeProfiles: StoreProfile[] = ["prints-3d", "pc-components", "plant-seeds"];

function cloneStorefrontSeed(seed: StorefrontSeed): StorefrontSeed {
  return {
    categories: structuredClone(seed.categories),
    products: structuredClone(seed.products),
    variants: structuredClone(seed.variants),
    newsPosts: structuredClone(seed.newsPosts),
    promoBanners: structuredClone(seed.promoBanners),
    featuredSales: structuredClone(seed.featuredSales),
  };
}

function createCouponSeed(profile: StoreProfile): Coupon[] {
  const sharedDates = {
    startsAt: "2026-03-01T00:00:00.000Z",
    endsAt: "2026-12-31T23:59:59.000Z",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
  };

  const profilePrefix = profile.replace("-", "").toUpperCase().slice(0, 6);
  return [
    couponSchema.parse({
      id: crypto.randomUUID(),
      code: `${profilePrefix}10`,
      type: "percentage",
      target: "subtotal",
      percentageOff: 10,
      startsAt: sharedDates.startsAt,
      endsAt: sharedDates.endsAt,
      usageLimit: 100,
      usageCount: 0,
      isActive: true,
      createdAt: sharedDates.createdAt,
      updatedAt: sharedDates.updatedAt,
    }),
    couponSchema.parse({
      id: crypto.randomUUID(),
      code: `${profilePrefix}150`,
      type: "fixed",
      target: "subtotal",
      amountOffCents: 15000,
      currency: "MXN",
      startsAt: sharedDates.startsAt,
      endsAt: sharedDates.endsAt,
      usageLimit: 30,
      usageCount: 0,
      isActive: true,
      createdAt: sharedDates.createdAt,
      updatedAt: sharedDates.updatedAt,
    }),
  ];
}

function createOrderSeed(seed: StorefrontSeed): AdminOrder[] {
  const primaryProduct = seed.products[0];
  const label = primaryProduct ? primaryProduct.name : "Catalog item";
  const currency = primaryProduct ? primaryProduct.currency : "MXN";
  const variantCount = seed.variants.length === 0 ? 1 : seed.variants.length;

  return [
    {
      id: crypto.randomUUID(),
      orderNumber: "ORD-1001",
      status: "paid",
      totalCents: (primaryProduct?.priceCents ?? 10000) * 2,
      currency,
      itemCount: Math.min(2, variantCount),
      productLabel: label,
      createdAt: "2026-03-03T09:00:00.000Z",
    },
    {
      id: crypto.randomUUID(),
      orderNumber: "ORD-1002",
      status: "pending",
      totalCents: primaryProduct?.priceCents ?? 10000,
      currency,
      itemCount: 1,
      productLabel: label,
      createdAt: "2026-03-06T17:20:00.000Z",
    },
    {
      id: crypto.randomUUID(),
      orderNumber: "ORD-1003",
      status: "shipped",
      totalCents: Math.round((primaryProduct?.priceCents ?? 10000) * 1.3),
      currency,
      itemCount: 1,
      productLabel: label,
      createdAt: "2026-03-09T12:45:00.000Z",
    },
  ];
}

function createRuntimeStoreByProfile(): RuntimeStoreByProfile {
  return storeProfiles.reduce<RuntimeStoreByProfile>(
    (accumulator, profile) => {
      const seed = cloneStorefrontSeed(getStorefrontSeed(profile));
      accumulator[profile] = {
        ...seed,
        coupons: createCouponSeed(profile),
        orders: createOrderSeed(seed),
      };
      return accumulator;
    },
    {
      "prints-3d": {} as ProfileRuntimeStore,
      "pc-components": {} as ProfileRuntimeStore,
      "plant-seeds": {} as ProfileRuntimeStore,
    },
  );
}

let runtimeStoreByProfile = createRuntimeStoreByProfile();

export function getProfileRuntimeStore(profile: StoreProfile): ProfileRuntimeStore {
  return runtimeStoreByProfile[profile];
}

export function resetRuntimeStore() {
  runtimeStoreByProfile = createRuntimeStoreByProfile();
}
