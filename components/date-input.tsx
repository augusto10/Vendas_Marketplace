"use client";

import { useRef } from "react";
import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type DateInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

export function DateInput({ className, onClick, onFocus, ...props }: DateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    const input = inputRef.current;
    if (!input) return;

    input.focus();
    input.showPicker?.();
  }

  return (
    <div className="relative">
      <Input
        {...props}
        ref={inputRef}
        type="date"
        className={cn("cursor-pointer pr-10", className)}
        onClick={(event) => {
          onClick?.(event);
          try {
            event.currentTarget.showPicker?.();
          } catch {
            // Some browsers only allow showPicker from the calendar button.
          }
        }}
        onFocus={(event) => {
          onFocus?.(event);
        }}
      />
      <button
        type="button"
        aria-label="Abrir calendario"
        className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => {
          try {
            openPicker();
          } catch {
            inputRef.current?.focus();
          }
        }}
      >
        <CalendarDays className="h-4 w-4" />
      </button>
    </div>
  );
}
