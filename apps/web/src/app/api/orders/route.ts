import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { PRIVATE_NO_STORE } from "@/server/http/cache-headers";
import { listOrdersForUser } from "@/server/orders/service";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: PRIVATE_NO_STORE },
    );
  }

  const orders = await listOrdersForUser(user.id);
  return NextResponse.json(
    {
      orders: orders.map((entry) => ({
        id: entry.order.id,
        orderNumber: entry.order.orderNumber,
        status: entry.order.status,
        paymentStatus: entry.order.paymentStatus,
        totalCents: entry.order.totalCents,
        currency: entry.order.currency,
        itemCount: entry.order.itemCount,
        createdAt: entry.order.createdAt.toISOString(),
        leadItemName: entry.leadItem?.name ?? null,
      })),
    },
    { headers: PRIVATE_NO_STORE },
  );
}
