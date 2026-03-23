"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FlashToast } from "@/server/feedback/flash-toast";
import { CLIENT_TOAST_EVENT } from "./client-toast";

type FlashToastHostProps = {
  initialToast: FlashToast | null;
};

const FLASH_TOAST_COOKIE = "__flash_toast";

export function FlashToastHost({ initialToast }: FlashToastHostProps) {
  const [toast, setToast] = useState<FlashToast | null>(initialToast);

  useEffect(() => {
    setToast(initialToast);
  }, [initialToast]);

  useEffect(() => {
    if (!toast) return;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${FLASH_TOAST_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
  }, [toast]);

  useEffect(() => {
    const onToast = (event: Event) => {
      const customEvent = event as CustomEvent<FlashToast>;
      if (!customEvent.detail?.message) return;
      setToast(customEvent.detail);
    };
    window.addEventListener(CLIENT_TOAST_EVENT, onToast as EventListener);
    return () => window.removeEventListener(CLIENT_TOAST_EVENT, onToast as EventListener);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (!toast) return null;

  const isSuccess = toast.type === "success";

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="flash-toast"
      className={cn(
        "fixed right-4 top-4 z-[100] flex w-full max-w-sm items-start gap-3 rounded-lg border p-4 shadow-lg",
        isSuccess
          ? "border-emerald-500/30 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
          : "border-red-500/30 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-100",
      )}
    >
      {isSuccess
        ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
      }
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{isSuccess ? "Success" : "Action failed"}</p>
        <p className="mt-0.5 text-sm opacity-90">{toast.message}</p>
      </div>
      <button
        onClick={() => setToast(null)}
        className="ml-auto -mt-0.5 rounded p-0.5 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
