"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "primary"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "gold"
    | "dark";
  size?: "sm" | "md" | "lg";
  dot?: boolean;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", size = "md", dot, children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center gap-1.5 font-display font-medium rounded-full border";

    const variants = {
      default: "bg-slate-100 text-slate-700 border-slate-200",
      primary: "bg-blue-50 text-blue-700 border-blue-200",
      success: "bg-emerald-50 text-emerald-700 border-emerald-200",
      warning: "bg-amber-50 text-amber-700 border-amber-200",
      danger: "bg-red-50 text-red-700 border-red-200",
      info: "bg-sky-50 text-sky-700 border-sky-200",
      gold: "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 border-amber-300 font-semibold",
      dark: "bg-slate-800/90 text-slate-200 border-slate-700",
    };

    const sizes = {
      sm: "px-2.5 py-0.5 text-xs",
      md: "px-3 py-1 text-xs sm:text-sm",
      lg: "px-4 py-1.5 text-sm sm:text-base",
    };

    return (
      <span
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {dot && (
          <span
            className="w-2 h-2 rounded-full bg-current opacity-90 shrink-0"
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    );
  },
);

Badge.displayName = "Badge";

export { Badge };