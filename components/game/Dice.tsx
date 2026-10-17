"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { KnowledgeSnakeLogo } from "@/components/ui/Logo";
import { Avatar } from "@/components/game/Avatar";
import type { AvatarId } from "@/lib/types";

const DICE_FACES = [
  [5], // 1
  [1, 9], // 2
  [1, 5, 9], // 3
  [1, 3, 7, 9], // 4
  [1, 3, 5, 7, 9], // 5
  [1, 2, 3, 7, 8, 9], // 6
];

interface DiceProps {
  value: number | null;
  rolling?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  onRollComplete?: (value: number) => void;
  children?: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}

export function Dice({
  value,
  rolling = false,
  size = "lg",
  onRollComplete,
  children,
  className,
  "aria-label": ariaLabel,
}: DiceProps) {
  const [displayValue, setDisplayValue] = useState(value ?? 5);
  const [isRolling, setIsRolling] = useState(false);
  const rollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sizeClasses = {
    sm: "w-14 h-14",
    md: "w-20 h-20",
    lg: "w-28 h-28",
    xl: "w-44 h-44 sm:w-52 sm:h-52",
  };

  const dotSizes = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
    xl: "w-6 h-6 sm:w-7 sm:h-7",
  };

  useEffect(() => {
    if (rolling && !isRolling) {
      startRolling();
    }
  }, [rolling]);

  const startRolling = () => {
    setIsRolling(true);
    let rolls = 0;
    const maxRolls = 14;
    const baseInterval = 45;

    const roll = () => {
      const randomValue = Math.floor(Math.random() * 6) + 1;
      setDisplayValue(randomValue);
      rolls++;

      if (rolls < maxRolls) {
        const delay = baseInterval + rolls * 10;
        rollTimeoutRef.current = setTimeout(roll, delay);
      } else {
        const finalValue = value ?? Math.floor(Math.random() * 6) + 1;
        setDisplayValue(finalValue);
        setIsRolling(false);
        onRollComplete?.(finalValue);
      }
    };

    roll();
  };

  useEffect(() => {
    if (!rolling && value !== null) {
      setDisplayValue(value);
      setIsRolling(false);
    }
  }, [value, rolling]);

  useEffect(() => {
    return () => {
      if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current);
    };
  }, []);

  const faces = DICE_FACES[(displayValue || 5) - 1] ?? DICE_FACES[4];

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center select-none",
        sizeClasses[size],
        className,
      )}
      role="img"
      aria-label={
        ariaLabel ||
        (rolling ? "กำลังทอยลูกเต๋า" : `ลูกเต๋าแสดง ${displayValue}`)
      }
      aria-live={rolling ? "polite" : "off"}
      style={{ perspective: "700px" }}
    >
      {/* 3D Perspective Glossy White-Blue Cube (Matches Reference Image) */}
      <div
        className={cn(
          "relative w-full h-full rounded-[26%] transition-transform duration-300",
          "bg-gradient-to-br from-[#ffffff] via-[#eef4ff] to-[#bfd4ff]",
          "border-2 border-white/90",
          "shadow-[10px_-8px_0_0_#d8e6ff,14px_12px_0_0_#8fb2f0,0_22px_45px_rgba(4,15,45,0.65),inset_0_4px_10px_rgba(255,255,255,0.95),inset_0_-8px_16px_rgba(116,155,230,0.55)]",
          (rolling || isRolling) && "animate-spin",
        )}
        style={{
          transform:
            rolling || isRolling
              ? undefined
              : "rotateX(12deg) rotateY(-16deg) rotateZ(-4deg)",
        }}
      >
        {/* Top/Right 3D Bevel Pip Accents (matching reference 3D cube edges) */}
        <span
          aria-hidden="true"
          className={cn(
            "absolute -top-1 right-1/3 rounded-full bg-[#153670]/85",
            size === "xl" ? "w-5 h-2.5" : "w-2 h-1",
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-1/4 -right-2 rounded-full bg-[#153670]/80",
            size === "xl" ? "w-2.5 h-5" : "w-1 h-2",
          )}
        />

        {/* Glossy Top-Left Highlight */}
        <div
          className="absolute inset-1.5 rounded-[22%] bg-gradient-to-br from-white/90 via-transparent to-blue-200/30 pointer-events-none"
          aria-hidden="true"
        />

        {/* Front 3x3 Pip Grid */}
        <div
          className={cn(
            "relative z-10 grid grid-cols-3 grid-rows-3 w-full h-full",
            size === "xl" ? "p-6 sm:p-7 gap-2" : "p-2.5 gap-1",
          )}
        >
          {Array.from({ length: 9 }, (_, i) => i + 1).map((pos) => {
            const active = faces.includes(pos);
            return (
              <div
                key={pos}
                className={cn(
                  "flex items-center justify-center transition-all duration-150",
                  active ? "opacity-100 scale-100" : "opacity-0 scale-50",
                )}
              >
                <span
                  className={cn(
                    "rounded-full bg-gradient-to-b from-[#0d2758] to-[#1e468a]",
                    dotSizes[size],
                    "shadow-[inset_0_2px_4px_rgba(0,0,0,0.65),0_1px_2px_rgba(255,255,255,0.8)]",
                  )}
                  aria-hidden="true"
                />
              </div>
            );
          })}
        </div>
      </div>

      {children && !rolling && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Full-Screen Dramatic 3D Dice Roll & Result Summary Overlay
 * (Matches the uploaded reference image with spinning 3D cube -> "ทอยลูกเต๋าแล้ว!" + Huge Number + Move Summary)
 */
export interface DiceRollOverlayModalProps {
  isOpen: boolean;
  rolling: boolean;
  value: number | null;
  round: number;
  totalRounds: number;
  playerName: string;
  avatarId: AvatarId;
  summaryText?: string | null;
  fromPos?: number | null;
  toPos?: number | null;
  onClose: () => void;
}

export function DiceRollOverlayModal({
  isOpen,
  rolling,
  value,
  round,
  totalRounds,
  playerName,
  avatarId,
  summaryText,
  fromPos,
  toPos,
  onClose,
}: DiceRollOverlayModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between overflow-hidden select-none animate-fade-in"
      style={{
        background:
          "radial-gradient(circle at 50% 42%, #1d57b8 0%, #0f3175 46%, #071940 100%)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="ผลการทอยลูกเต๋า"
      onClick={() => {
        if (!rolling && value !== null) onClose();
      }}
    >
      {/* Decorative Sparkles & Radial Aura matching the reference image */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] sm:w-[460px] sm:h-[460px] rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] sm:w-[320px] sm:h-[320px] rounded-full border border-sky-300/20" />
        <span className="absolute top-[22%] left-[18%] text-sky-300/60 text-xl animate-pulse">
          ✦
        </span>
        <span className="absolute top-[18%] right-[20%] text-sky-200/70 text-2xl animate-pulse">
          ✦
        </span>
        <span className="absolute bottom-[28%] left-[14%] text-blue-300/50 text-lg animate-pulse">
          ✦
        </span>
        <span className="absolute bottom-[20%] right-[24%] text-sky-300/60 text-xl animate-pulse">
          ✦
        </span>
      </div>

      {/* Top Bar inside Overlay: Logo | รอบที่ X / Y | ชื่อผู้เล่น + Avatar */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between text-white">
        <KnowledgeSnakeLogo size="sm" theme="dark" />

        <div className="font-display font-bold text-sm sm:text-lg text-blue-100 tracking-wide">
          รอบที่ {Math.max(1, round)} / {totalRounds}
        </div>

        <div className="flex items-center gap-2.5">
          <span className="font-display font-bold text-sm sm:text-base text-white">
            {playerName}
          </span>
          <Avatar avatarId={avatarId} size="sm" ring />
        </div>
      </div>

      {/* Center Stage: 3D Cube Dice + "ทอยลูกเต๋าแล้ว!" + Huge Number + Summary */}
      <div
        className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-8 sm:mb-10">
          <Dice value={value} rolling={rolling} size="xl" />
        </div>

        {rolling || value === null ? (
          <div className="space-y-2 animate-pulse">
            <p className="font-display text-2xl sm:text-3xl font-extrabold text-white drop-shadow">
              กำลังทอยลูกเต๋า...
            </p>
            <p className="text-sm text-blue-200">
              ลุ้นแต้มเพื่อเดินตัวละครของคุณบนกระดาน!
            </p>
          </div>
        ) : (
          <div className="space-y-3 animate-bounce-in">
            <p className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-wide drop-shadow">
              ทอยลูกเต๋าแล้ว!
            </p>

            <div className="font-display text-7xl sm:text-8xl font-black text-white leading-none drop-shadow-[0_8px_28px_rgba(56,189,248,0.65)]">
              {value}
            </div>

            {/* Move Summary Pill */}
            <div className="pt-3 flex flex-col items-center gap-3">
              <div className="px-5 py-2.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-white font-display font-bold text-sm sm:text-base shadow-lg">
                {fromPos != null && toPos != null ? (
                  <span>
                    เดินหน้า <strong>+{value} ช่อง</strong> · จากช่องที่{" "}
                    <strong className="text-amber-300">{fromPos}</strong> → ช่องที่{" "}
                    <strong className="text-emerald-300">{toPos}</strong>
                  </span>
                ) : (
                  <span>{summaryText || `เดินหน้า +${value} ช่อง`}</span>
                )}
              </div>

              {summaryText && (
                <p className="text-xs sm:text-sm text-sky-200 font-medium max-w-md">
                  {summaryText}
                </p>
              )}

              <Button
                type="button"
                variant="gold"
                size="lg"
                onClick={onClose}
                className="mt-2 min-w-[220px]"
              >
                ดูการเดินบนกระดาน →
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom hint */}
      <div className="relative z-10 pb-5 text-center text-xs text-blue-200/70">
        {!rolling && value !== null && "แตะที่หน้าจอหรือกดปุ่มเพื่อกลับไปดูตัวละครเดินบนกระดาน"}
      </div>
    </div>
  );
}

interface DiceButtonProps {
  value: number | null;
  rolling?: boolean;
  onRoll: () => void;
  disabled?: boolean;
  size?: "md" | "lg";
  className?: string;
}

export function DiceButton({
  value,
  rolling,
  onRoll,
  disabled,
  size = "lg",
  className,
}: DiceButtonProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <Dice
        value={value}
        rolling={rolling}
        size={size}
        aria-label={
          rolling ? "กำลังทอยลูกเต๋า" : value ? `ได้ ${value}` : "ยังไม่ได้ทอย"
        }
      />
      <Button
        onClick={onRoll}
        disabled={disabled || rolling}
        variant="primary"
        size={size === "lg" ? "lg" : "md"}
        className={cn("min-w-[160px]", className)}
        iconLeft={<span className="text-xl">🎲</span>}
      >
        {rolling ? "กำลังทอย..." : value ? `ทอยได้ ${value}` : "ทอยลูกเต๋า"}
      </Button>
    </div>
  );
}