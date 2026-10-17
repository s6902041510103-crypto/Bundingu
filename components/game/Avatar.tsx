"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { getAvatar, AVATARS } from "@/lib/game-data";
import type { AvatarId } from "@/lib/types";

interface AvatarProps {
  avatarId: AvatarId;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  ring?: boolean;
  className?: string;
  "aria-label"?: string;
}

const sizeClasses = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-12 h-12 text-lg",
  xl: "w-16 h-16 text-2xl",
};

const ringSizes = {
  xs: "ring-1",
  sm: "ring-1",
  md: "ring-2",
  lg: "ring-2",
  xl: "ring-3",
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
        "inline-flex items-center justify-center rounded-full font-display font-bold select-none",
        "shadow-md transition-transform duration-200",
        sizeClasses[size],
        ring && `ring-2 ring-offset-2 ring-offset-slate-900 ${ringSizes[size]} ${avatar.ring}`,
        className,
      )}
      style={{
        background: `linear-gradient(135deg, ${avatar.primary} 0%, ${avatar.secondary} 100%)`,
        color: avatar.accent,
      } as React.CSSProperties}
      aria-label={ariaLabel || avatar.labelTh}
      role="img"
    >
      {avatar.emoji}
    </span>
  );
}

interface AvatarPickerProps {
  selectedId: AvatarId;
  onSelect: (id: AvatarId) => void;
  size?: "sm" | "md" | "lg";
  columns?: number;
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
      className={cn("grid gap-3", `grid-cols-${columns}`, className)}
      role="radiogroup"
      aria-label="เลือกอวตาร์"
    >
      {AVATARS.map((avatar) => (
        <button
          key={avatar.id}
          type="button"
          role="radio"
          aria-checked={avatar.id === selectedId}
          aria-label={avatar.labelTh}
          onClick={() => onSelect(avatar.id)}
          className={cn(
            "relative flex flex-col items-center gap-1.5 rounded-xl border-2 transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
            avatar.id === selectedId
              ? "border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-400/20 scale-105"
              : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/50",
          )}
        >
          <Avatar avatarId={avatar.id} size={size} ring />
          <span className="text-xs font-medium text-slate-300 truncate max-w-[60px]">
            {avatar.labelTh}
          </span>
        </button>
      ))}
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
  maxVisible = 5,
  size = "md",
  className,
}: AvatarGroupProps) {
  const visible = avatarIds.slice(0, maxVisible);
  const remaining = avatarIds.length - maxVisible;

  return (
    <div className={cn("flex -space-x-2", className)} aria-label={`${avatarIds.length} ผู้เล่น`}>
      {visible.map((id, index) => (
        <Avatar
          key={`${id}-${index}`}
          avatarId={id}
          size={size}
          ring
          className="bg-slate-900 border-2 border-slate-900"
        />
      ))}
      {remaining > 0 && (
        <span
          className={cn(
            "flex items-center justify-center rounded-full font-medium border-2 border-slate-700 bg-slate-800 text-slate-300",
            sizeClasses[size],
          )}
        >
          +{remaining}
        </span>
      )}
    </div>
  );
}