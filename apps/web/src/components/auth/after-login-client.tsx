"use client";

import { useEffect, useRef, useState } from "react";

type AfterLoginClientProps = {
  nextPath: string;
};

function normalizeNextPath(rawPath: string) {
  if (rawPath.startsWith("/")) {
    return rawPath;
  }
  return "/auth/sync-cart?next=%2F";
}

export function AfterLoginClient({ nextPath }: AfterLoginClientProps) {
  const [error, setError] = useState<string | null>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) {
      return;
    }
    hasStarted.current = true;

    const run = async () => {
      const destination = normalizeNextPath(nextPath);
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch("/api/auth/bootstrap", {
          method: "POST",
          signal: controller.signal,
        });
        if (!response.ok) {
          setError("Could not initialize your session. Redirecting...");
          window.setTimeout(() => window.location.replace(destination), 800);
          return;
        }
        window.location.replace(destination);
      } catch {
        setError("Could not initialize your session. Redirecting...");
        window.setTimeout(() => window.location.replace(destination), 800);
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    void run();
  }, [nextPath]);

  return (
    <section className="space-y-3 rounded-lg border bg-card p-6 text-card-foreground">
      <p className="text-sm font-medium">{error ? "Session initialization failed." : "Finalizing sign-in..."}</p>
      <p className="text-xs text-muted-foreground">
        {error
          ? "Continuing with limited session bootstrap. If this persists, check auth environment variables."
          : "Please wait while we secure your session and redirect you."}
      </p>
    </section>
  );
}
