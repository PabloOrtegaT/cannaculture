import {
  categorySchema,
  featuredSaleSchema,
  newsPostSchema,
  productSchema,
  productVariantSchema,
  promoBannerSchema,
  type Category,
  type FeaturedSale,
  type NewsPost,
  type Product,
  type ProductVariant,
  type PromoBanner,
  type StoreProfile,
} from "@base-ecommerce/domain";

export type StorefrontSeed = {
  categories: Category[];
  products: Product[];
  variants: ProductVariant[];
  newsPosts: NewsPost[];
  promoBanners: PromoBanner[];
  featuredSales: FeaturedSale[];
};

const categoryByProfile: Record<StoreProfile, Category> = {
  "prints-3d": categorySchema.parse({
    id: "9f7d04f5-8fe1-4d55-8f16-77ad80de0529",
    slug: "3d-prints",
    name: "3D Prints",
    description: "Custom and ready-to-ship 3D printed products.",
    templateKey: "prints-3d",
  }),
  "pc-components": categorySchema.parse({
    id: "81d2d378-f0e3-4f13-8cf8-1ece386fddad",
    slug: "pc-components",
    name: "PC Components",
    description: "Computer parts and peripherals.",
    templateKey: "pc-components",
  }),
  "plant-seeds": categorySchema.parse({
    id: "95fb9238-d814-4dff-b425-c94f5ff955ef",
    slug: "plant-seeds",
    name: "Plant Seeds",
    description: "Seasonal and heirloom seeds.",
    templateKey: "plant-seeds",
  }),
};

const productByProfile: Record<StoreProfile, Product> = {
  "prints-3d": productSchema.parse({
    id: "f7f5fd01-878e-4735-baeb-8c798001fdcb",
    categoryId: "9f7d04f5-8fe1-4d55-8f16-77ad80de0529",
    name: "Dragon Planter",
    slug: "dragon-planter",
    description: "Decorative 3D-printed planter with drainage base.",
    baseSku: "3DP-DRAGON-PLANTER",
    status: "active",
    currency: "MXN",
    priceCents: 159900,
    compareAtPriceCents: 199900,
    tags: ["3d", "home", "decor"],
    createdAt: "2026-01-10T10:00:00.000Z",
    updatedAt: "2026-03-02T11:10:00.000Z",
  }),
  "pc-components": productSchema.parse({
    id: "2e06737a-1191-4148-83f3-d95ff8d7f5aa",
    categoryId: "81d2d378-f0e3-4f13-8cf8-1ece386fddad",
    name: "AM5 Motherboard X",
    slug: "am5-motherboard-x",
    description: "ATX motherboard with PCIe 5.0 and DDR5 support.",
    baseSku: "PC-AM5-MOBO-X",
    status: "active",
    currency: "MXN",
    priceCents: 229900,
    compareAtPriceCents: 259900,
    tags: ["pc", "motherboard"],
    createdAt: "2026-01-15T09:00:00.000Z",
    updatedAt: "2026-03-03T11:00:00.000Z",
  }),
  "plant-seeds": productSchema.parse({
    id: "64043f75-f238-4ca8-a45d-1ee4932e986c",
    categoryId: "95fb9238-d814-4dff-b425-c94f5ff955ef",
    name: "Basil Seeds Pack",
    slug: "basil-seeds-pack",
    description: "Organic basil seeds with planting guide.",
    baseSku: "SEED-BASIL-001",
    status: "active",
    currency: "MXN",
    priceCents: 9900,
    compareAtPriceCents: 12900,
    tags: ["seed", "basil", "garden"],
    createdAt: "2026-02-01T11:00:00.000Z",
    updatedAt: "2026-03-01T10:00:00.000Z",
  }),
};

const variantsByProfile: Record<StoreProfile, ProductVariant[]> = {
  "prints-3d": [
    productVariantSchema.parse({
      id: "a3e99316-c66b-44eb-8f22-f7ec22a4329d",
      productId: "f7f5fd01-878e-4735-baeb-8c798001fdcb",
      sku: "3DP-DRAGON-PLANTER-PLA-02",
      name: "PLA / 0.2mm",
      priceCents: 159900,
      compareAtPriceCents: 199900,
      stockOnHand: 14,
      isDefault: true,
      attributeValues: {
        material: "PLA",
        layer_height_mm: 0.2,
        infill_percent: 20,
        print_time_hours: 6.5,
      },
      createdAt: "2026-01-10T10:00:00.000Z",
      updatedAt: "2026-03-02T11:10:00.000Z",
    }),
    productVariantSchema.parse({
      id: "36d3a95a-e2e4-4332-8085-31f62f471f31",
      productId: "f7f5fd01-878e-4735-baeb-8c798001fdcb",
      sku: "3DP-DRAGON-PLANTER-PETG-016",
      name: "PETG / 0.16mm",
      priceCents: 169900,
      compareAtPriceCents: 209900,
      stockOnHand: 7,
      isDefault: false,
      attributeValues: {
        material: "PETG",
        layer_height_mm: 0.16,
        infill_percent: 22,
        print_time_hours: 7.2,
      },
      createdAt: "2026-01-10T10:00:00.000Z",
      updatedAt: "2026-03-02T11:10:00.000Z",
    }),
  ],
  "pc-components": [
    productVariantSchema.parse({
      id: "d4ac5f5e-c432-4667-937f-7f1356e7674a",
      productId: "2e06737a-1191-4148-83f3-d95ff8d7f5aa",
      sku: "PC-AM5-MOBO-X-ATX",
      name: "ATX Edition",
      priceCents: 229900,
      compareAtPriceCents: 259900,
      stockOnHand: 9,
      isDefault: true,
      attributeValues: {
        socket: "AM5",
        form_factor: "ATX",
        chipset: "B650",
        wattage: 95,
      },
      createdAt: "2026-01-15T09:00:00.000Z",
      updatedAt: "2026-03-03T11:00:00.000Z",
    }),
  ],
  "plant-seeds": [
    productVariantSchema.parse({
      id: "49f3192f-e4c6-4262-8dda-614e92db9e3f",
      productId: "64043f75-f238-4ca8-a45d-1ee4932e986c",
      sku: "SEED-BASIL-001-PACK",
      name: "Starter Pack",
      priceCents: 9900,
      compareAtPriceCents: 12900,
      stockOnHand: 0,
      isDefault: true,
      attributeValues: {
        species: "Ocimum basilicum",
        sunlight: "full-sun",
        germination_days: 8,
        seasonality: "spring",
        is_heirloom: true,
      },
      createdAt: "2026-02-01T11:00:00.000Z",
      updatedAt: "2026-03-01T10:00:00.000Z",
    }),
  ],
};

const newsByProfile: Record<StoreProfile, NewsPost[]> = {
  "prints-3d": [
    newsPostSchema.parse({
      id: "bfc09a2d-32dc-4f55-9f9d-3cb63db6f96c",
      slug: "new-materials-available",
      title: "New Materials Available for 3D Print Orders",
      summary: "PETG and TPU options are now available on selected products.",
      body: "We expanded our materials catalog with PETG and TPU options to offer better flexibility and durability for specific use cases. These options are now available on selected catalog items.",
      status: "published",
      publishedAt: "2026-03-05T08:00:00.000Z",
      createdAt: "2026-03-05T08:00:00.000Z",
      updatedAt: "2026-03-05T08:00:00.000Z",
    }),
  ],
  "pc-components": [
    newsPostSchema.parse({
      id: "6b895527-5b3f-4f4e-8419-8b6b90769a5f",
      slug: "bios-update-ready",
      title: "BIOS Update Guides for AM5 Boards",
      summary: "Step-by-step update guidance was added for compatible AM5 boards.",
      body: "Our support team published a full BIOS update checklist for AM5 boards, covering compatibility checks, firmware download references, and rollback recommendations for safer updates.",
      status: "published",
      publishedAt: "2026-03-04T09:00:00.000Z",
      createdAt: "2026-03-04T09:00:00.000Z",
      updatedAt: "2026-03-04T09:00:00.000Z",
    }),
  ],
  "plant-seeds": [
    newsPostSchema.parse({
      id: "2f0d7069-c788-4ee8-8f40-f0f0df00ebfe",
      slug: "seed-bundles-spring",
      title: "Spring Seed Bundles Are Live",
      summary: "Curated seed bundles for spring planting are now in stock.",
      body: "Our spring collection now includes curated seed bundles designed for home growers. Each bundle includes planting guidance and seasonality recommendations.",
      status: "published",
      publishedAt: "2026-03-03T09:00:00.000Z",
      createdAt: "2026-03-03T09:00:00.000Z",
      updatedAt: "2026-03-03T09:00:00.000Z",
    }),
  ],
};

const promoBannersByProfile: Record<StoreProfile, PromoBanner[]> = {
  "prints-3d": [
    promoBannerSchema.parse({
      id: "0907f2a4-7b53-428c-8dba-e10e32011f70",
      title: "March Sale: Up to 20% off selected 3D prints",
      subtitle: "Limited time discounts on 3D print essentials.",
      ctaLabel: "Shop deals",
      ctaHref: "/catalog",
      startsAt: "2026-03-01T00:00:00.000Z",
      endsAt: "2026-03-31T23:59:59.000Z",
      isActive: true,
    }),
  ],
  "pc-components": [
    promoBannerSchema.parse({
      id: "a7f101ea-9a91-42e7-8f40-a94fed59f4a6",
      title: "Performance Week: Motherboard and RAM bundles",
      subtitle: "Bundle discounts for core PC builds.",
      ctaLabel: "View bundles",
      ctaHref: "/catalog",
      startsAt: "2026-03-01T00:00:00.000Z",
      endsAt: "2026-03-31T23:59:59.000Z",
      isActive: true,
    }),
  ],
  "plant-seeds": [
    promoBannerSchema.parse({
      id: "75d315c7-a326-49c5-a7e2-8e4f8ad587ce",
      title: "Spring Garden Picks: Save on seed packs",
      subtitle: "Best starters for this planting season.",
      ctaLabel: "Start planting",
      ctaHref: "/catalog",
      startsAt: "2026-03-01T00:00:00.000Z",
      endsAt: "2026-03-31T23:59:59.000Z",
      isActive: true,
    }),
  ],
};

const featuredSalesByProfile: Record<StoreProfile, FeaturedSale[]> = {
  "prints-3d": [
    featuredSaleSchema.parse({
      id: "63db6674-782d-4f3f-bf2a-29aa9768f948",
      title: "Featured 3D Deals",
      description: "Best weekly offers chosen by the admin team.",
      productIds: ["f7f5fd01-878e-4735-baeb-8c798001fdcb"],
      startsAt: "2026-03-01T00:00:00.000Z",
      endsAt: "2026-03-31T23:59:59.000Z",
      isActive: true,
    }),
  ],
  "pc-components": [
    featuredSaleSchema.parse({
      id: "998c66f0-04f9-4062-b6ce-e4768f4ef9a8",
      title: "Featured PC Deals",
      description: "Performance picks for this week.",
      productIds: ["2e06737a-1191-4148-83f3-d95ff8d7f5aa"],
      startsAt: "2026-03-01T00:00:00.000Z",
      endsAt: "2026-03-31T23:59:59.000Z",
      isActive: true,
    }),
  ],
  "plant-seeds": [
    featuredSaleSchema.parse({
      id: "9999cb71-b322-4055-9b38-cf1ead6f3f77",
      title: "Featured Garden Deals",
      description: "Seasonal picks for home growers.",
      productIds: ["64043f75-f238-4ca8-a45d-1ee4932e986c"],
      startsAt: "2026-03-01T00:00:00.000Z",
      endsAt: "2026-03-31T23:59:59.000Z",
      isActive: true,
    }),
  ],
};

const storefrontSeedByProfile: Record<StoreProfile, StorefrontSeed> = {
  "prints-3d": {
    categories: [categoryByProfile["prints-3d"]],
    products: [productByProfile["prints-3d"]],
    variants: variantsByProfile["prints-3d"],
    newsPosts: newsByProfile["prints-3d"],
    promoBanners: promoBannersByProfile["prints-3d"],
    featuredSales: featuredSalesByProfile["prints-3d"],
  },
  "pc-components": {
    categories: [categoryByProfile["pc-components"]],
    products: [productByProfile["pc-components"]],
    variants: variantsByProfile["pc-components"],
    newsPosts: newsByProfile["pc-components"],
    promoBanners: promoBannersByProfile["pc-components"],
    featuredSales: featuredSalesByProfile["pc-components"],
  },
  "plant-seeds": {
    categories: [categoryByProfile["plant-seeds"]],
    products: [productByProfile["plant-seeds"]],
    variants: variantsByProfile["plant-seeds"],
    newsPosts: newsByProfile["plant-seeds"],
    promoBanners: promoBannersByProfile["plant-seeds"],
    featuredSales: featuredSalesByProfile["plant-seeds"],
  },
};

export function getStorefrontSeed(profile: StoreProfile): StorefrontSeed {
  return storefrontSeedByProfile[profile];
}
