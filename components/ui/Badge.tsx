"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "info" | "gold";
  size?: "sm" | "md" | "lg";
  dot?: boolean;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", size = "md", dot, children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center gap-1.5 font-medium rounded-full border";

    const variants = {
      default: "bg-slate-700 text-slate-200 border-slate-600",
      primary: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      success: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      warning: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      danger: "bg-red-500/20 text-red-300 border-red-500/30",
      info: "bg-sky-500/20 text-sky-300 border-sky-500/30",
      gold: "bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 border-amber-400",
    };

    const sizes = {
      sm: "px-2 py-0.5 text-xs",
      md: "px-3 py-1 text-sm",
      lg: "px-4 py-1.5 text-base",
    };

    return (
      <span ref={ref} className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
        {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" aria-hidden="true" />}
        {children}
      </span>
    );
  },
);

Badge.displayName = "Badge";

export { Badge };