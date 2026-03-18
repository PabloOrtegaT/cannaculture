"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@base-ecommerce/ui";

type ViewerResponse = {
  authenticated: boolean;
  isAdmin?: boolean;
};

export function HomeAuthActions() {
  const [viewer, setViewer] = useState<ViewerResponse | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      try {
        const response = await fetch("/api/auth/viewer", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          setViewer({ authenticated: false });
          return;
        }
        const payload = (await response.json()) as ViewerResponse;
        setViewer(payload);
      } catch {
        setViewer({ authenticated: false });
      }
    };

    void run();
    return () => controller.abort();
  }, []);

  return (
    <>
      {viewer?.isAdmin && (
        <Button asChild variant="outline">
          <a href="/admin">Admin snapshot</a>
        </Button>
      )}
      <Button asChild variant="outline">
        <Link href={viewer?.authenticated ? "/account" : "/login"}>{viewer?.authenticated ? "My account" : "Login"}</Link>
      </Button>
    </>
  );
}

