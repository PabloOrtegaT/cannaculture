"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ViewerResponse = {
  authenticated: boolean;
  email?: string;
  role?: "owner" | "manager" | "catalog";
  isAdmin?: boolean;
};

export function StorefrontAuthLinks() {
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

  if (!viewer || !viewer.authenticated) {
    return (
      <Link href="/login" className="hover:underline">
        Login
      </Link>
    );
  }

  return (
    <>
      <Link href="/account" className="hover:underline">
        Account
      </Link>
      <Link href="/logout" className="hover:underline">
        Logout
      </Link>
      {viewer.isAdmin && (
        <a href="/admin" className="hover:underline">
          Admin
        </a>
      )}
    </>
  );
}

