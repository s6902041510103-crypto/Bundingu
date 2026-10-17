"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface LoadingProps {
  label?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
  dark?: boolean;
  className?: string;
}

export function Loading({
  label = "กำลังโหลดข้อมูล...",
  size = "md",
  fullScreen = false,
  dark = false,
  className,
}: LoadingProps) {
  const sizes = {
    sm: "w-5 h-5 border-2",
    md: "w-9 h-9 border-3",
    lg: "w-12 h-12 border-4",
  };

  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 p-6",
        dark ? "text-slate-200" : "text-slate-600",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          "rounded-full animate-spin",
          sizes[size],
          dark
            ? "border-blue-400/30 border-t-amber-400"
            : "border-blue-200 border-t-blue-600",
        )}
      />
      {label && <p className="font-display text-sm font-medium">{label}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className={cn(
          "min-h-screen w-full flex items-center justify-center",
          dark ? "bg-arena-navy" : "bg-[#f4f7fb]",
        )}
      >
        {content}
      </div>
    );
  }

  return content;
}
