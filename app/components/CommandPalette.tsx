"use client";

import { cn } from "@/app/lib/utils";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { ChevronRight, LayoutGrid, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useEffect } from "react";

type Item = {
  id: string;
  label: string;
  description: string;
  icon: typeof Plus;
  iconTone: "brand" | "neutral";
  shortcut?: string[];
  onSelect: (router: ReturnType<typeof useRouter>) => void;
};

const actions: Item[] = [
  {
    id: "create-task",
    label: "Create new task",
    description: "Add a task to any board",
    icon: Plus,
    iconTone: "brand",
    shortcut: ["C"],
    onSelect: (router) => router.push("/?new-task=1"),
  },
  {
    id: "create-board",
    label: "Create new board",
    description: "Start a new project board",
    icon: Plus,
    iconTone: "brand",
    shortcut: ["Shift", "C"],
    onSelect: (router) => router.push("/"),
  },
];

const navigation: Item[] = [
  {
    id: "go-kanban",
    label: "Go to Kanban Board",
    description: "Open the board view",
    icon: LayoutGrid,
    iconTone: "neutral",
    shortcut: ["GB"],
    onSelect: (router) => router.push("/"),
  },
];

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  function run(item: Item) {
    item.onSelect(router);
    onOpenChange(false);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      className="top-1/2! -translate-y-1/2! w-[600px]! max-w-[calc(100%-2rem)]! rounded-2xl! p-0"
    >
      <Command data-testid="command-palette" className="rounded-2xl p-0!">
        <div className="flex items-center gap-2 border-b border-primary-200 px-5 py-4">
          <Search className="size-5 text-primary-400" />
          <CommandPrimitive.Input
            placeholder="Search…"
            className="flex-1 bg-transparent text-sm text-primary-600 placeholder:text-primary-400 outline-none"
          />
          <ShortcutKey>⌘ K</ShortcutKey>
        </div>

        <CommandList className="max-h-[456px] px-4 py-4">
          <CommandEmpty className="py-6 text-center text-sm text-primary-400">
            No results found.
          </CommandEmpty>

          <CommandGroup
            heading="Actions"
            className="pb-4 **:[[cmdk-group-heading]]:text-primary-400! **:[[cmdk-group-heading]]:px-3! **:[[cmdk-group-heading]]:pb-3! **:[[cmdk-group-heading]]:uppercase! **:[[cmdk-group-heading]]:text-xs! **:[[cmdk-group-heading]]:font-medium! **:[[cmdk-group]]:p-0!"
          >
            {actions.map((item) => (
              <PaletteItem key={item.id} item={item} onRun={run} />
            ))}
          </CommandGroup>

          <CommandGroup
            heading="Navigation"
            className="**:[[cmdk-group-heading]]:text-primary-400! **:[[cmdk-group-heading]]:px-3! **:[[cmdk-group-heading]]:pb-3! **:[[cmdk-group-heading]]:uppercase! **:[[cmdk-group-heading]]:text-xs! **:[[cmdk-group-heading]]:font-medium! **:[[cmdk-group]]:p-0!"
          >
            {navigation.map((item) => (
              <PaletteItem key={item.id} item={item} onRun={run} />
            ))}
          </CommandGroup>
        </CommandList>

        <div className="flex items-center justify-between gap-4 border-t border-primary-200 bg-primary-50 px-4 py-3 text-[10px] text-primary-400">
          <div className="flex items-center gap-3">
            <Hint keys={["↑", "↓"]}>Navigate</Hint>
            <Hint keys={["↵"]}>Select</Hint>
            <Hint keys={["Esc"]}>Close</Hint>
            <Hint keys={["Tab"]}>Category</Hint>
          </div>
          <p className="text-right">
            Type to search tasks, actions, and settings
          </p>
        </div>
      </Command>
    </CommandDialog>
  );
}

function PaletteItem({
  item,
  onRun,
}: {
  item: Item;
  onRun: (i: Item) => void;
}) {
  const Icon = item.icon;
  return (
    <CommandItem
      value={`${item.label} ${item.description}`}
      onSelect={() => onRun(item)}
      className="rounded-lg! gap-3 p-3 data-[selected=true]:bg-primary-100!  data-[selected=true]:[&>svg]:opacity-100 [&>svg]:opacity-0"
    >
      <span
        data-testid={`palette-icon-${item.id}`}
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          item.iconTone === "brand"
            ? "bg-brand text-white"
            : "bg-secondary-300 text-white",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-sm text-primary-600">{item.label}</span>
        <span className="text-xs text-primary-300">{item.description}</span>
      </div>
      {item.shortcut && (
        <span className="flex items-center gap-1.5 text-xs text-primary-400">
          {item.shortcut.map((k, i) => (
            <Fragment key={`${k}-${i}`}>
              {i > 0 && <span>+</span>}
              <ShortcutKey>{k}</ShortcutKey>
            </Fragment>
          ))}
        </span>
      )}
      <ChevronRight className="size-4 shrink-0 text-primary-400" />
    </CommandItem>
  );
}

function ShortcutKey({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded border border-primary-200 bg-white px-1.5 font-sans text-xs text-primary-500">
      {children}
    </span>
  );
}

function Hint({ keys, children }: { keys: string[]; children: string }) {
  return (
    <span className="flex items-center gap-1.5">
      {keys.map((k) => (
        <LegendKey key={k}>{k}</LegendKey>
      ))}
      <span>{children}</span>
    </span>
  );
}

function LegendKey({ children }: { children: string }) {
  return (
    <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded bg-primary-100 px-1.5 font-sans text-[10px] text-primary-500">
      {children}
    </span>
  );
}
