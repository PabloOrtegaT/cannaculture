import { cookies } from "next/headers";
import { z } from "zod";

const FLASH_TOAST_COOKIE = "__flash_toast";

const flashToastSchema = z.object({
  type: z.enum(["success", "error"]),
  code: z.string().min(1).max(64),
  message: z.string().min(1).max(240),
});

export type FlashToast = z.infer<typeof flashToastSchema>;

function encodeToast(input: FlashToast) {
  return encodeURIComponent(JSON.stringify(input));
}

function decodeToast(raw: string) {
  try {
    return flashToastSchema.parse(JSON.parse(decodeURIComponent(raw)));
  } catch {
    return null;
  }
}

export async function setFlashToast(toast: FlashToast) {
  const cookieStore = await cookies();
  cookieStore.set(FLASH_TOAST_COOKIE, encodeToast(toast), {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60,
  });
}

export async function popFlashToast() {
  const cookieStore = await cookies();
  const stored = cookieStore.get(FLASH_TOAST_COOKIE);
  if (!stored?.value) {
    return null;
  }

  return decodeToast(stored.value);
}
