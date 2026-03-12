import { THEME_STORAGE_KEY } from "./theme";

export const themeInitializationScript = `
(() => {
  try {
    const storageKey = "${THEME_STORAGE_KEY}";
    const root = document.documentElement;
    const storedTheme = window.localStorage.getItem(storageKey);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isStoredThemeValid = storedTheme === "light" || storedTheme === "dark";
    const theme = isStoredThemeValid ? storedTheme : (prefersDark ? "dark" : "light");

    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  } catch (_) {
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
  }
})();
`;
