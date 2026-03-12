import type { Category, Product, ProductVariant, StoreProfile } from "@base-ecommerce/domain";
import { mapHomeContent } from "@/features/home/map-home-content";
import { getActiveStoreProfile } from "@/server/config/store-profile";
import { getProfileRuntimeStore } from "./runtime-store";

export type ProductSort = "featured" | "price-asc" | "price-desc" | "name-asc";

export type CatalogSearchParams = {
  categorySlug?: string;
  query?: string;
  sort?: ProductSort;
};

export type ProductWithContext = {
  product: Product;
  category: Category;
  variants: ProductVariant[];
};

type StorefrontContext = {
  profile: StoreProfile;
  newsPosts: ReturnType<typeof getProfileRuntimeStore>["newsPosts"];
  promoBanners: ReturnType<typeof getProfileRuntimeStore>["promoBanners"];
  featuredSales: ReturnType<typeof getProfileRuntimeStore>["featuredSales"];
  categories: Category[];
  products: Product[];
  variants: ProductVariant[];
  productById: Map<string, Product>;
  categoryById: Map<string, Category>;
  variantsByProductId: Map<string, ProductVariant[]>;
};

function getStorefrontContext(): StorefrontContext {
  const profile = getActiveStoreProfile();
  const seed = getProfileRuntimeStore(profile);

  const productById = new Map(seed.products.map((product) => [product.id, product]));
  const categoryById = new Map(seed.categories.map((category) => [category.id, category]));
  const variantsByProductId = seed.variants.reduce(
    (acc, variant) => {
      const existing = acc.get(variant.productId) ?? [];
      existing.push(variant);
      acc.set(variant.productId, existing);
      return acc;
    },
    new Map<string, ProductVariant[]>(),
  );

  return {
    profile,
    newsPosts: seed.newsPosts,
    promoBanners: seed.promoBanners,
    featuredSales: seed.featuredSales,
    categories: seed.categories,
    products: seed.products,
    variants: seed.variants,
    productById,
    categoryById,
    variantsByProductId,
  };
}

function getVariantDisplayPrice(product: Product, variantsByProductId: Map<string, ProductVariant[]>) {
  const variants = variantsByProductId.get(product.id) ?? [];
  if (variants.length === 0) {
    return product.priceCents;
  }
  return Math.min(...variants.map((variant) => variant.priceCents));
}

export function listCategories() {
  const { categories } = getStorefrontContext();
  return categories;
}

export function getCategoryBySlug(slug: string) {
  const { categories } = getStorefrontContext();
  return categories.find((category) => category.slug === slug) ?? null;
}

export function listCatalogProducts(params: CatalogSearchParams = {}) {
  const { categories, products: catalogProducts, variantsByProductId, categoryById } = getStorefrontContext();
  const normalizedQuery = params.query?.trim().toLowerCase() ?? "";
  const categoryFilterId = params.categorySlug
    ? categories.find((category) => category.slug === params.categorySlug)?.id
    : undefined;

  let products = catalogProducts.filter((product) => product.status === "active");

  if (categoryFilterId) {
    products = products.filter((product) => product.categoryId === categoryFilterId);
  }

  if (normalizedQuery) {
    products = products.filter((product) => {
      const haystack = `${product.name} ${product.description ?? ""} ${product.tags.join(" ")}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }

  const sort = params.sort ?? "featured";
  if (sort === "name-asc") {
    products = [...products].sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === "price-asc") {
    products = [...products].sort((a, b) => getVariantDisplayPrice(a, variantsByProductId) - getVariantDisplayPrice(b, variantsByProductId));
  } else if (sort === "price-desc") {
    products = [...products].sort((a, b) => getVariantDisplayPrice(b, variantsByProductId) - getVariantDisplayPrice(a, variantsByProductId));
  } else {
    products = [...products].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  return products.map((product) => {
    const category = categoryById.get(product.categoryId);
    const variants = variantsByProductId.get(product.id) ?? [];
    const stockOnHand = variants.reduce((acc, variant) => acc + variant.stockOnHand, 0);
    return {
      product,
      category: category ?? null,
      variants,
      hasStock: stockOnHand > 0,
      minVariantPriceCents: variants.length > 0 ? Math.min(...variants.map((variant) => variant.priceCents)) : product.priceCents,
    };
  });
}

export function getProductByRoute(categorySlug: string, productSlug: string): ProductWithContext | null {
  const { categories, products: catalogProducts, variantsByProductId } = getStorefrontContext();
  const category = categories.find((entry) => entry.slug === categorySlug) ?? null;
  if (!category) {
    return null;
  }

  const product = catalogProducts.find(
    (item) => item.slug === productSlug && item.categoryId === category.id && item.status === "active",
  );
  if (!product) {
    return null;
  }

  return {
    product,
    category,
    variants: variantsByProductId.get(product.id) ?? [],
  };
}

export function getHomeContent(now = new Date()) {
  const context = getStorefrontContext();

  return mapHomeContent({
    now,
    products: context.products.filter((product) => product.status === "active"),
    newsPosts: context.newsPosts,
    promoBanners: context.promoBanners,
    featuredSales: context.featuredSales,
  });
}

export function getAdminContentSnapshot() {
  const profile = getActiveStoreProfile();
  const seed = getProfileRuntimeStore(profile);

  return {
    profile,
    banners: seed.promoBanners.length,
    newsPosts: seed.newsPosts.length,
    featuredSales: seed.featuredSales.length,
  };
}

export function getProductById(productId: string) {
  const { productById } = getStorefrontContext();
  return productById.get(productId) ?? null;
}
