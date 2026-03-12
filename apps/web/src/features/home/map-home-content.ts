import type { FeaturedSale, NewsPost, Product, PromoBanner } from "@base-ecommerce/domain";

type HomeMapInput = {
  now: Date;
  newsPosts: NewsPost[];
  promoBanners: PromoBanner[];
  featuredSales: FeaturedSale[];
  products: Product[];
};

export type HomeContent = {
  activeBanner: PromoBanner | null;
  news: NewsPost[];
  featuredProducts: Product[];
};

function isActiveWindow(startsAt: string, endsAt: string, now: Date) {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const current = now.getTime();
  return current >= start && current <= end;
}

export function mapHomeContent(input: HomeMapInput): HomeContent {
  const activeBanner =
    input.promoBanners.find((banner) => banner.isActive && isActiveWindow(banner.startsAt, banner.endsAt, input.now)) ??
    null;

  const activeFeaturedSale = input.featuredSales.find(
    (sale) => sale.isActive && isActiveWindow(sale.startsAt, sale.endsAt, input.now),
  );

  const featuredProducts = activeFeaturedSale
    ? input.products.filter((product) => activeFeaturedSale.productIds.includes(product.id))
    : [];

  const news = input.newsPosts
    .filter((post) => post.status === "published")
    .sort((a, b) => {
      const aDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bDate = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bDate - aDate;
    });

  return {
    activeBanner,
    news,
    featuredProducts,
  };
}
