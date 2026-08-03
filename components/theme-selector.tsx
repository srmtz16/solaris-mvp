"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme, type ThemePreference } from "@/components/theme-provider";

const options: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

export function ThemeSelector({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
      {options.map((option) => {
        const Icon = option.icon;
        const selected = theme === option.value;
        return (
          <Button
            key={option.value}
            type="button"
            variant={selected ? "default" : "ghost"}
            size={compact ? "icon" : "sm"}
            className={compact ? "size-8" : undefined}
            onClick={() => setTheme(option.value)}
            title={`Tema ${option.label}`}
            aria-label={`Tema ${option.label}`}
          >
            <Icon className="size-4" />
            {compact ? null : option.label}
          </Button>
        );
      })}
    </div>
  );
}
