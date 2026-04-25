export const PRIVATE_NO_STORE = { "Cache-Control": "private, no-store" } as const;
export const PUBLIC_CATALOG = {
  "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
} as const;
