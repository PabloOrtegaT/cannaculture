"use client";

import { Button } from "@cannaculture/ui";
import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { useHydratedValue } from "@/hooks/use-hydrated-value";
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
  // Always start with DEFAULT_THEME to match server render; sync from browser after hydration
  const [theme, setTheme] = useHydratedValue<Theme>(DEFAULT_THEME, getBrowserThemePreference);

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
      variant="ghost"
      size="icon"
      onClick={onToggle}
      aria-label="Toggle day and night theme"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
