"use client";

import { useEffect, useState } from "react";
import { Button } from "@base-ecommerce/ui";
import {
  applyThemeToDocument,
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  type Theme,
  resolveThemePreference,
  toggleTheme,
} from "@/features/theme/theme";

function getBrowserThemePreference(): Theme {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return resolveThemePreference(storedTheme, prefersDark);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_THEME;
    }

    return getBrowserThemePreference();
  });

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const onToggle = () => {
    const nextTheme = toggleTheme(theme);
    setTheme(nextTheme);
    applyThemeToDocument(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onToggle}
      aria-label="Toggle day and night theme"
    >
      Theme
    </Button>
  );
}
