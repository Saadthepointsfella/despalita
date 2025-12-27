// src/components/ui/input.tsx
import * as React from "react";
import { cn } from "@/lib/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-md border border-border bg-bg px-3 text-sm text-text",
          "placeholder:text-muted/70",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
