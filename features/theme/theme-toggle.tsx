"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label="Alternar tema"
      onClick={() => {
        document.documentElement.classList.toggle("dark");
        localStorage.setItem("theme", document.documentElement.classList.contains("dark") ? "dark" : "light");
      }}
    >
      <Sun className="h-4 w-4 dark:hidden" />
      <Moon className="hidden h-4 w-4 dark:block" />
    </Button>
  );
}
