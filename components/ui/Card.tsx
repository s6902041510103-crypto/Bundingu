"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "soft" | "glass" | "glass-strong" | "arena";
  padding?: "none" | "sm" | "md" | "lg";
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", padding = "md", children, ...props }, ref) => {
    const baseStyles = "rounded-2xl transition-all duration-200";

    const variants = {
      default: "bg-white border border-slate-200/90 shadow-soft text-slate-900",
      elevated: "bg-white border border-slate-100 shadow-card text-slate-900",
      soft: "bg-slate-50/90 border border-slate-200/80 text-slate-900",
      glass: "glass text-slate-100",
      "glass-strong": "glass-strong shadow-elevated text-slate-100",
      arena:
        "bg-[#10254c]/90 border border-blue-400/25 shadow-xl text-white backdrop-blur-md",
    };

    const paddings = {
      none: "",
      sm: "p-3.5",
      md: "p-5",
      lg: "p-7",
    };

    return (
      <div
        ref={ref}
        className={cn(baseStyles, variants[variant], paddings[padding], className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";

const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("mb-4", className)} {...props}>
      {children}
    </div>
  ),
);

CardHeader.displayName = "CardHeader";

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  size?: "sm" | "md" | "lg" | "xl";
}

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, size = "md", children, ...props }, ref) => {
    const sizes = {
      sm: "text-base font-semibold",
      md: "text-lg font-bold",
      lg: "text-xl font-bold",
      xl: "text-2xl font-bold",
    };
    return (
      <h3 ref={ref} className={cn("font-display", sizes[size], className)} {...props}>
        {children}
      </h3>
    );
  },
);

CardTitle.displayName = "CardTitle";

const CardDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => (
  <p ref={ref} className={cn("text-slate-500 text-sm mt-1", className)} {...props}>
    {children}
  </p>
));

CardDescription.displayName = "CardDescription";

const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn(className)} {...props}>
      {children}
    </div>
  ),
);

CardContent.displayName = "CardContent";

const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("mt-4 flex items-center gap-3", className)} {...props}>
      {children}
    </div>
  ),
);

CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };