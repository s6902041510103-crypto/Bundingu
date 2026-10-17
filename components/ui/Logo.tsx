"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  theme?: "light" | "dark";
  href?: string;
  showSubtitle?: boolean;
  className?: string;
}

export function KnowledgeSnakeLogo({
  size = "md",
  theme = "dark",
  href = "/",
  showSubtitle = false,
  className,
}: LogoProps) {
  const iconSizes = {
    sm: "w-9 h-9",
    md: "w-11 h-11",
    lg: "w-14 h-14",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-lg sm:text-xl",
    lg: "text-2xl sm:text-3xl",
  };

  const content = (
    <div className={cn("inline-flex items-center gap-2.5 select-none group", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 shadow-md border-2 border-white/80 shrink-0 transition-transform duration-200 group-hover:scale-105",
          iconSizes[size],
        )}
      >
        <Trophy className="w-3/5 h-3/5 text-amber-950 drop-shadow-xs" />
        <span
          className="absolute -bottom-1 -right-1 text-sm sm:text-base drop-shadow"
          aria-hidden="true"
        >
          🐍
        </span>
      </div>
      <div className="flex flex-col leading-tight">
        <div className={cn("font-display font-extrabold tracking-tight flex items-center gap-1", textSizes[size])}>
          <span className={theme === "dark" ? "text-amber-300 drop-shadow-xs" : "text-amber-500"}>
            Knowledge
          </span>
          <span className={theme === "dark" ? "text-white" : "text-[#0f2547]"}>
            Snake
          </span>
        </div>
        {showSubtitle && (
          <span
            className={cn(
              "text-[11px] font-medium",
              theme === "dark" ? "text-blue-200" : "text-slate-500",
            )}
          >
            เกมบันไดงูพิชิตความรู้
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="focus-visible:outline-none rounded-xl">
        {content}
      </Link>
    );
  }

  return content;
}
