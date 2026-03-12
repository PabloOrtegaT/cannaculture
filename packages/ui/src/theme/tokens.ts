export const themeTokens = {
  radius: {
    sm: "var(--radius-sm)",
    md: "var(--radius-md)",
    lg: "var(--radius-lg)",
  },
  color: {
    background: "var(--background)",
    foreground: "var(--foreground)",
    card: "var(--card)",
    cardForeground: "var(--card-foreground)",
    primary: "var(--primary)",
    primaryForeground: "var(--primary-foreground)",
    muted: "var(--muted)",
    mutedForeground: "var(--muted-foreground)",
    border: "var(--border)",
    ring: "var(--ring)",
  },
} as const;

export type ThemeTokens = typeof themeTokens;
