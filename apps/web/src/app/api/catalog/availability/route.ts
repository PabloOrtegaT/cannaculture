import { z } from "zod";
import { NextResponse } from "next/server";
import { getVariantAvailability } from "@/server/cart/service";
import { enforceRateLimit, getClientIpFromRequest } from "@/server/security/rate-limit";

const variantIdSchema = z.string().min(1).max(128);

export async function GET(request: Request) {
  const clientIp = getClientIpFromRequest(request);
  const rateLimit = await enforceRateLimit({
    key: `api:catalog:availability:${clientIp}`,
    maxRequests: 60,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limited." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const rawVariantId = searchParams.get("variantId")?.trim();
  const parsedVariantId = variantIdSchema.safeParse(rawVariantId);
  if (!parsedVariantId.success) {
    return NextResponse.json({ error: "Invalid variantId." }, { status: 400 });
  }

  const availability = await getVariantAvailability(parsedVariantId.data);
  return NextResponse.json(availability);
}
