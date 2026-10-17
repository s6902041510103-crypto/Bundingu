"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { getAvatar, AVATARS } from "@/lib/game-data";
import type { AvatarId } from "@/lib/types";

interface AvatarProps {
  avatarId: AvatarId | string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  ring?: boolean;
  className?: string;
  "aria-label"?: string;
}

const sizeClasses = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-base",
  md: "w-10 h-10 text-xl",
  lg: "w-12 h-12 text-2xl",
  xl: "w-16 h-16 text-3xl",
  "2xl": "w-20 h-20 text-4xl",
};

export function Avatar({
  avatarId,
  size = "md",
  ring = false,
  className,
  "aria-label": ariaLabel,
}: AvatarProps) {
  const avatar = getAvatar(avatarId);

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-display font-bold select-none shrink-0",
        "shadow-sm transition-transform duration-200 border-2 border-white",
        sizeClasses[size],
        ring && "ring-2 ring-amber-400/80",
        className,
      )}
      style={
        {
          background: `radial-gradient(circle at 35% 30%, ${avatar.secondary} 0%, ${avatar.primary} 100%)`,
          borderColor: ring ? avatar.ring : "#ffffff",
          color: avatar.accent,
        } as React.CSSProperties
      }
      aria-label={ariaLabel || avatar.labelTh}
      title={avatar.labelTh}
      role="img"
    >
      <span className="leading-none drop-shadow-2xs">{avatar.emoji}</span>
    </span>
  );
}

interface AvatarPickerProps {
  selectedId: AvatarId;
  onSelect: (id: AvatarId) => void;
  size?: "sm" | "md" | "lg";
  columns?: 4 | 6;
  className?: string;
}

export function AvatarPicker({
  selectedId,
  onSelect,
  size = "md",
  columns = 6,
  className,
}: AvatarPickerProps) {
  return (
    <div
      className={cn(
        "grid gap-2.5",
        columns === 4 ? "grid-cols-4" : "grid-cols-4 sm:grid-cols-6",
        className,
      )}
      role="radiogroup"
      aria-label="เลือก Avatar ตัวละครสัตว์"
    >
      {AVATARS.map((avatar) => {
        const isSelected = avatar.id === selectedId;
        return (
          <button
            key={avatar.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={avatar.labelTh}
            onClick={() => onSelect(avatar.id)}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1 p-2 rounded-2xl border-2 transition-all duration-150 cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              isSelected
                ? "border-blue-600 bg-blue-50/90 shadow-md shadow-blue-500/15 scale-105"
                : "border-slate-200 bg-slate-50/70 hover:border-blue-300 hover:bg-white",
            )}
          >
            <Avatar avatarId={avatar.id} size={size} ring={isSelected} />
            <span
              className={cn(
                "text-[11px] font-display font-medium truncate max-w-[68px]",
                isSelected ? "text-blue-700 font-bold" : "text-slate-600",
              )}
            >
              {avatar.labelTh}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface AvatarGroupProps {
  avatarIds: AvatarId[];
  maxVisible?: number;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

export function AvatarGroup({
  avatarIds,
  maxVisible = 4,
  size = "xs",
  className,
}: AvatarGroupProps) {
  const visible = avatarIds.slice(0, maxVisible);
  const remaining = avatarIds.length - maxVisible;

  return (
    <div
      className={cn("inline-flex items-center -space-x-1.5", className)}
      aria-label={`${avatarIds.length} ผู้เล่น`}
    >
      {visible.map((id, index) => (
        <Avatar
          key={`${id}-${index}`}
          avatarId={id}
          size={size}
          className="border border-white shadow-xs"
        />
      ))}
      {remaining > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full font-display font-bold border border-white bg-slate-900 text-amber-300 shadow-xs",
            size === "xs" ? "w-5 h-5 text-[9px]" : sizeClasses[size],
          )}
        >
          +{remaining}
        </span>
      )}
    </div>
  );
}