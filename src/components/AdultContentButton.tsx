"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

export function AdultContentButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen((p) => !p)}
        className="h-8 touch-manipulation border-primary px-2 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground"
      >
        +18
      </Button>
      {open && (
        <div className="absolute right-0 top-10 z-[100] w-52 rounded-xl border border-border bg-card p-3 shadow-lg dark:shadow-2xl sm:left-1/2 sm:-translate-x-1/2 sm:right-auto">
          <p className="text-center text-xs font-medium text-foreground">
            🔞 Contenido +18
          </p>
          <p className="mt-1 text-center text-[11px] text-muted-foreground">
            Próximamente disponible.
          </p>
        </div>
      )}
    </div>
  );
}
