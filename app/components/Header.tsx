"use client";

import { Button } from "@/ui/button";
import { Settings } from "lucide-react";
import { useState } from "react";
import { CommandPalette } from "./CommandPalette";

export default function Header() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <div className="px-3 py-2 flex items-center gap-2 border-b border-primary-200 w-full justify-end">
      <Button
        className="text-primary-400"
        size="icon-sm"
        variant="outline"
        data-testid="command-palette-trigger"
        onClick={() => setPaletteOpen(true)}
        aria-label="Open command palette"
      >
        ⌘
      </Button>
      <Button className="text-primary-400" size="icon-sm" variant="outline">
        <Settings />
      </Button>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
