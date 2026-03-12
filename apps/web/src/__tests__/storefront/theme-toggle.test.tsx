import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { THEME_STORAGE_KEY } from "@/features/theme/theme";

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("theme toggle", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
    mockMatchMedia(false);
  });

  it("uses system preference when there is no persisted theme", async () => {
    render(<ThemeToggle />);

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("light");
    });
    expect(screen.getByRole("button", { name: "Toggle day and night theme" })).toHaveTextContent("Theme");
  });

  it("loads persisted theme preference from localStorage", async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("dark");
    });
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(screen.getByRole("button", { name: "Toggle day and night theme" })).toHaveTextContent("Theme");
  });

  it("toggles theme and persists the updated preference", async () => {
    render(<ThemeToggle />);
    const user = userEvent.setup();
    const toggleButton = screen.getByRole("button", { name: "Toggle day and night theme" });

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("light");
    });

    await user.click(toggleButton);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(toggleButton).toHaveTextContent("Theme");
  });
});
