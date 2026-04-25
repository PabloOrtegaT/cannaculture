"use client";

import { useId, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type MobileFilterToggleProps = {
  children: React.ReactNode;
};

export function MobileFilterToggle({ children }: MobileFilterToggleProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="md:hidden">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5"
        aria-expanded={open}
        aria-controls={panelId}
      >
        {open ? <X className="h-3.5 w-3.5" /> : <SlidersHorizontal className="h-3.5 w-3.5" />}
        {open ? "Close filters" : "Filter products"}
      </Button>

      {open && (
        <div id={panelId} className="mt-3 rounded-lg border bg-muted/30 p-4">
          {children}
        </div>
      )}
    </div>
  );
}
