"use client";

import { useEffect, useMemo, useState } from "react";
import type { FlashToast } from "@/server/feedback/flash-toast";

type FlashToastHostProps = {
  initialToast: FlashToast | null;
};

const FLASH_TOAST_COOKIE = "__flash_toast";

function toneClasses(type: FlashToast["type"]) {
  if (type === "success") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  }
  return "border-red-500/40 bg-red-500/10 text-red-200";
}

export function FlashToastHost({ initialToast }: FlashToastHostProps) {
  const [toast, setToast] = useState<FlashToast | null>(initialToast);

  useEffect(() => {
    setToast(initialToast);
  }, [initialToast]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${FLASH_TOAST_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
  }, [toast]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setToast(null);
    }, 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const className = useMemo(() => {
    if (!toast) {
      return "";
    }
    return `fixed right-4 top-4 z-[100] max-w-sm rounded-md border px-4 py-3 text-sm shadow-md backdrop-blur ${toneClasses(toast.type)}`;
  }, [toast]);

  if (!toast) {
    return null;
  }

  return (
    <div role="status" aria-live="polite" className={className} data-testid="flash-toast">
      <p className="font-medium">{toast.type === "success" ? "Success" : "Action failed"}</p>
      <p className="mt-1">{toast.message}</p>
    </div>
  );
}
