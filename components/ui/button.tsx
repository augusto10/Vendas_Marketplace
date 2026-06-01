import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold tracking-tight transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-y-[1px]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_14px_28px_-18px_rgba(255,168,36,0.85)] hover:bg-primary/90 hover:shadow-[0_18px_32px_-18px_rgba(255,168,36,0.9)]",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        outline: "border border-border bg-card text-card-foreground shadow-sm hover:border-primary/40 hover:bg-primary/5",
        ghost: "hover:bg-muted/80 hover:text-foreground",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        icon: "h-11 w-11"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";
