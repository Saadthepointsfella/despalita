// src/components/ui/button.tsx
import * as React from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium " +
  "transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 " +
  "disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-text text-bg border-text hover:opacity-90 active:opacity-85",
  secondary:
    "bg-panel text-text border-border hover:bg-panel/70 active:bg-panel/60",
  ghost:
    "bg-transparent text-text border-transparent hover:bg-panel/60 active:bg-panel/50",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3",
  md: "h-10 px-4",
  lg: "h-11 px-5 text-[15px]",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 animate-spin rounded-full border border-bg/30 border-t-bg" />
          <span>Loading</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
