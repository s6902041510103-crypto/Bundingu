"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  theme?: "light" | "dark";
  href?: string;
  showSubtitle?: boolean;
  variant?: "combo" | "badge";
  className?: string;
}

export function KnowledgeSnakeLogo({
  size = "md",
  theme = "dark",
  href = "/",
  showSubtitle = false,
  variant = "combo",
  className,
}: LogoProps) {
  // If variant is "badge", render the full illustrated badge directly
  if (variant === "badge") {
    const badgeSizes = {
      sm: "w-24 h-24",
      md: "w-36 h-36",
      lg: "w-52 h-52 sm:w-60 sm:h-60",
      xl: "w-64 h-64 sm:w-80 sm:h-80",
    };

    const badgeContent = (
      <div
        className={cn(
          "relative select-none transition-transform duration-300 hover:scale-105 inline-flex items-center justify-center",
          badgeSizes[size],
          className,
        )}
      >
        <Image
          src="/logo-transparent.png"
          alt="Knowledge Snake เกมบันไดงูพิชิตความรู้"
          width={400}
          height={400}
          className="w-full h-full object-contain filter drop-shadow-xl"
          priority
        />
      </div>
    );

    if (href) {
      return (
        <Link href={href} className="focus-visible:outline-none rounded-2xl inline-block">
          {badgeContent}
        </Link>
      );
    }
    return badgeContent;
  }

  // Combo variant: Mascot emblem + stylized brand typography
  const iconSizes = {
    sm: "w-9 h-9",
    md: "w-11 h-11",
    lg: "w-14 h-14",
    xl: "w-20 h-20",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-lg sm:text-xl",
    lg: "text-2xl sm:text-3xl",
    xl: "text-3xl sm:text-4xl",
  };

  const content = (
    <div className={cn("inline-flex items-center gap-2.5 select-none group", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center rounded-2xl shrink-0 transition-transform duration-200 group-hover:scale-105",
          iconSizes[size],
        )}
      >
        <Image
          src="/logo-transparent.png"
          alt="Knowledge Snake Logo"
          width={80}
          height={80}
          className="w-full h-full object-contain filter drop-shadow-md"
          priority
        />
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
