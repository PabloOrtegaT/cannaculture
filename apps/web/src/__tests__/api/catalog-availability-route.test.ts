import { beforeEach, describe, expect, it, vi } from "vitest";

const { getVariantAvailabilityMock } = vi.hoisted(() => ({
  getVariantAvailabilityMock: vi.fn(),
}));

vi.mock("@/server/cart/service", () => ({
  getVariantAvailability: getVariantAvailabilityMock,
}));

import { GET } from "@/app/api/catalog/availability/route";

describe("api/catalog/availability route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getVariantAvailabilityMock.mockReturnValue({
      variantId: "variant-1",
      stockOnHand: 3,
      isPurchasable: true,
    });
  });

  it("returns 400 when variantId query is missing", async () => {
    const request = new Request("http://localhost:3000/api/catalog/availability");

    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Missing variantId." });
  });

  it("returns availability payload for requested variant", async () => {
    const request = new Request("http://localhost:3000/api/catalog/availability?variantId=variant-1");

    const response = await GET(request);

    expect(getVariantAvailabilityMock).toHaveBeenCalledWith("variant-1");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      variantId: "variant-1",
      stockOnHand: 3,
      isPurchasable: true,
    });
  });
});
