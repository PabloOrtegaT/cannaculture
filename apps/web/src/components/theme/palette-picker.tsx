"use client";

import { useEffect, useRef, useState } from "react";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PALETTE_STORAGE_KEY } from "@/features/theme/palette-script";

type PaletteOption = {
  name: string;
  label: string;
  color: string;
};

const PALETTES: PaletteOption[] = [
  { name: "amber",   label: "Amber",   color: "oklch(0.62 0.175 68)"  },
  { name: "ocean",   label: "Ocean",   color: "oklch(0.58 0.16 210)"  },
  { name: "crimson", label: "Crimson", color: "oklch(0.55 0.22 20)"   },
  { name: "slate",   label: "Slate",   color: "oklch(0.50 0.08 245)"  },
  { name: "grow",    label: "Grow",    color: "oklch(0.52 0.18 145)"  },
  { name: "tech",    label: "Tech",    color: "oklch(0.58 0.22 270)"  },
  { name: "riviera", label: "Riviera", color: "oklch(0.62 0.16 195)"  },
];

export function PalettePicker() {
  const [open, setOpen] = useState(false);
  // "amber" matches the server render; localStorage is synced after hydration in the effect below
  const [active, setActive] = useState("amber");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading localStorage after hydration is intentional; server always renders "amber" to avoid mismatch
    setActive(localStorage.getItem(PALETTE_STORAGE_KEY) ?? "amber");
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  function selectPalette(name: string) {
    if (name === "amber") {
      document.documentElement.removeAttribute("data-palette");
    } else {
      document.documentElement.setAttribute("data-palette", name);
    }
    localStorage.setItem(PALETTE_STORAGE_KEY, name);
    setActive(name);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Switch color palette"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Palette className="h-4 w-4" />
      </Button>

      {open && (
        <div
          role="dialog"
          aria-label="Color palette options"
          className="absolute right-0 top-full mt-1 z-50 w-52 rounded-md border bg-popover p-3 shadow-md"
        >
          <p className="text-xs font-medium text-muted-foreground mb-2.5">Color palette</p>
          <div className="grid grid-cols-4 gap-x-2 gap-y-3">
            {PALETTES.map((palette) => {
              const isActive = active === palette.name;
              return (
                <button
                  key={palette.name}
                  onClick={() => selectPalette(palette.name)}
                  className="flex flex-col items-center gap-1 group"
                  aria-label={palette.label}
                  aria-pressed={isActive}
                >
                  <span
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      isActive
                        ? "border-foreground ring-2 ring-offset-1 ring-foreground/30 scale-110"
                        : "border-transparent group-hover:border-foreground/40 group-hover:scale-105"
                    }`}
                    style={{ backgroundColor: palette.color }}
                  />
                  <span className="text-[9px] text-muted-foreground leading-none">
                    {palette.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
