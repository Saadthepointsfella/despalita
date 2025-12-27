// src/components/ui/arrow-link.tsx
import Link, { type LinkProps } from "next/link";
import { cn } from "@/lib/cn";
import * as React from "react";

type Arrow = "right" | "upRight";

export type ArrowLinkProps =
  LinkProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    arrow?: Arrow;
    muted?: boolean;
  };

export function ArrowLink({
  arrow = "right",
  muted = false,
  className,
  children,
  ...props
}: ArrowLinkProps) {
  const glyph = arrow === "upRight" ? "↗" : "→";

  return (
    <Link
      className={cn(
        "inline-flex items-center gap-2 text-sm transition",
        muted ? "text-muted hover:text-text" : "text-text/90 hover:text-text",
        className
      )}
      {...props}
    >
      <span>{children}</span>
      <span className="text-accent">{glyph}</span>
    </Link>
  );
}
