export const PALETTE_STORAGE_KEY = "palette";

export const paletteInitializationScript = `
(() => {
  try {
    const key = "palette";
    const stored = window.localStorage.getItem(key);
    const valid = ["amber","ocean","crimson","slate","grow","tech","riviera"];
    if (stored && stored !== "amber" && valid.includes(stored)) {
      document.documentElement.setAttribute("data-palette", stored);
    }
  } catch (_) {}
})();
`;
