"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme, type ThemePreference } from "@/components/theme-provider";

const options: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-card p-1">
      {options.map((option) => {
        const Icon = option.icon;
        const selected = theme === option.value;
        return (
          <Button key={option.value} type="button" variant={selected ? "default" : "ghost"} size="sm" onClick={() => setTheme(option.value)}>
            <Icon className="size-4" />
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
