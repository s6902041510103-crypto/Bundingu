"use client";

import React, { forwardRef } from "react";
import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-display font-semibold transition-all duration-200 cursor-pointer " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 " +
    "disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98] " +
    "rounded-xl px-5 py-2.5 text-sm",
  {
    variants: {
      variant: {
        default:
          "bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200",
        primary:
          "bg-gradient-to-b from-[#2573ff] to-[#1554d1] text-white hover:from-[#3680ff] hover:to-[#1b5de0] shadow-md shadow-blue-600/25 border border-blue-400/30",
        success:
          "bg-gradient-to-b from-[#22c55e] to-[#15803d] text-white hover:from-[#34d399] hover:to-[#16a34a] shadow-md shadow-emerald-600/25 border border-emerald-400/30",
        gold:
          "bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-500/25 border border-amber-300/50",
        secondary:
          "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-xs",
        dark:
          "bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-700",
        outline:
          "border-2 border-blue-600 text-blue-600 bg-transparent hover:bg-blue-50",
        ghost:
          "bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900",
        destructive:
          "bg-gradient-to-b from-red-500 to-red-600 text-white hover:from-red-400 hover:to-red-500 shadow-md shadow-red-600/25 border border-red-400/30",
      },
      size: {
        sm: "px-3.5 py-1.5 text-xs gap-1.5 rounded-lg",
        md: "px-5 py-2.5 text-sm gap-2 rounded-xl",
        lg: "px-6 py-3.5 text-base gap-2.5 rounded-2xl",
        xl: "px-8 py-4 text-lg gap-3 rounded-2xl",
        icon: "p-2.5 rounded-xl",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
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
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading,
      iconLeft,
      iconRight,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4 shrink-0"
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