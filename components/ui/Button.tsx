"use client";

import React, { forwardRef } from "react";
import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold " +
    "disabled:opacity-50 disabled:pointer-events-none " +
    "rounded-xl px-5 py-2.5 text-sm",
  {
    variants: {
      variant: {
        default: "bg-slate-700 text-slate-100 hover:bg-slate-600 active:bg-slate-800",
        primary: "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/30",
        secondary: "bg-slate-800 text-slate-100 border border-slate-600 hover:bg-slate-700 hover:border-slate-500",
        outline: "border-2 border-slate-600 bg-transparent hover:bg-slate-800",
        ghost: "bg-transparent hover:bg-slate-800 text-slate-300",
        destructive: "bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-500/30",
        success: "bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-500/30",
      },
      size: {
        sm: "px-3 py-1.5 text-xs gap-1.5",
        md: "px-5 py-2.5 text-sm gap-2",
        lg: "px-7 py-3.5 text-base gap-2.5",
        xl: "px-10 py-4.5 text-lg gap-3",
        icon: "p-2.5",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, loading, iconLeft, iconRight, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && iconLeft}
        {children}
        {!loading && iconRight}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };