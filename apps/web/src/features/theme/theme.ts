export const THEME_STORAGE_KEY = "base-ecommerce-theme";

export const themeValues = ["light", "dark"] as const;
export type Theme = (typeof themeValues)[number];

export const DEFAULT_THEME: Theme = "light";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

export function normalizeStoredTheme(value: string | null | undefined): Theme | null {
  return isTheme(value) ? value : null;
}

export function resolveThemePreference(storedTheme: string | null | undefined, prefersDark: boolean): Theme {
  const normalizedStoredTheme = normalizeStoredTheme(storedTheme);
  if (normalizedStoredTheme) {
    return normalizedStoredTheme;
  }

  return prefersDark ? "dark" : DEFAULT_THEME;
}

export function toggleTheme(currentTheme: Theme): Theme {
  return currentTheme === "dark" ? "light" : "dark";
}

export function applyThemeToDocument(theme: Theme, root: HTMLElement = document.documentElement) {
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}
