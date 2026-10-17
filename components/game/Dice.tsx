"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { KnowledgeSnakeLogo } from "@/components/ui/Logo";
import { Avatar } from "@/components/game/Avatar";
import type { AvatarId } from "@/lib/types";

/**
 * Standard 3x3 pip positions for dice values 1..6:
 *  1  2  3
 *  4  5  6
 *  7  8  9
 */
const DICE_FACES: Record<number, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

/**
 * Adjacent faces for a standard die (opposite faces sum to 7)
 * when `front` is the rolled value.
 */
function getCubeFaceNumbers(frontValue: number): {
  front: number;
  back: number;
  right: number;
  left: number;
  top: number;
  bottom: number;
} {
  const v = Math.min(6, Math.max(1, frontValue || 5));
  const map: Record<
    number,
    { front: number; back: number; top: number; bottom: number; right: number; left: number }
  > = {
    1: { front: 1, back: 6, top: 2, bottom: 5, right: 3, left: 4 },
    2: { front: 2, back: 5, top: 6, bottom: 1, right: 3, left: 4 },
    3: { front: 3, back: 4, top: 2, bottom: 5, right: 6, left: 1 },
    4: { front: 4, back: 3, top: 2, bottom: 5, right: 1, left: 6 },
    5: { front: 5, back: 2, top: 1, bottom: 6, right: 3, left: 4 },
    6: { front: 6, back: 1, top: 5, bottom: 2, right: 3, left: 4 },
  };
  return map[v];
}

function CubeFacePips({
  faceValue,
  pipSizeClass,
  paddingClass,
}: {
  faceValue: number;
  pipSizeClass: string;
  paddingClass: string;
}) {
  const activePositions = DICE_FACES[faceValue] ?? DICE_FACES[5];
  return (
    <div
      className={cn(
        "grid grid-cols-3 grid-rows-3 w-full h-full",
        paddingClass,
      )}
    >
      {Array.from({ length: 9 }, (_, i) => i + 1).map((pos) => {
        const hasPip = activePositions.includes(pos);
        return (
          <div key={pos} className="flex items-center justify-center">
            {hasPip && (
              <span
                className={cn(
                  "rounded-full bg-gradient-to-b from-[#0b2350] via-[#133574] to-[#1e4a9a]",
                  pipSizeClass,
                  "shadow-[inset_0_2px_4px_rgba(0,0,0,0.75),0_1px_2px_rgba(255,255,255,0.85)]",
                )}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

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
  const [spinTick, setSpinTick] = useState(0);
  const [justLanded, setJustLanded] = useState(false);
  const wasRollingRef = React.useRef(false);

  // Cube dimensions in px so translateZ is exact
  const cubePx = {
    sm: 48,
    md: 68,
    lg: 96,
    xl: 164,
  }[size];

  const halfPx = cubePx / 2;

  const pipSizeClass = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
    xl: "w-6 h-6",
  }[size];

  const paddingClass = {
    sm: "p-1.5 gap-0.5",
    md: "p-2.5 gap-1",
    lg: "p-3.5 gap-1.5",
    xl: "p-5 gap-2",
  }[size];

  const faceRadiusClass = {
    sm: "rounded-xl",
    md: "rounded-2xl",
    lg: "rounded-2xl",
    xl: "rounded-[28px]",
  }[size];

  useEffect(() => {
    if (!rolling) {
      if (wasRollingRef.current) {
        wasRollingRef.current = false;
        setJustLanded(true);
      }
      if (value !== null) {
        onRollComplete?.(value);
      }
      return;
    }
    wasRollingRef.current = true;
    setJustLanded(false);
    const interval = window.setInterval(() => {
      setSpinTick((t) => t + 1);
    }, 110);
    return () => window.clearInterval(interval);
  }, [rolling, value, onRollComplete]);

  // Guaranteed: when not rolling, the front face ALWAYS stays still on `value` (or 5 if not rolled yet)
  const effectiveFrontValue = !rolling
    ? value !== null && value >= 1 && value <= 6
      ? value
      : 5
    : (spinTick % 6) + 1;

  const faces = getCubeFaceNumbers(effectiveFrontValue);

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center select-none",
        className,
      )}
      style={{
        width: `${cubePx}px`,
        height: `${cubePx}px`,
        perspective: `${cubePx * 4.5}px`,
      }}
      role="img"
      aria-label={
        ariaLabel ||
        (rolling
          ? "กำลังทอยลูกเต๋า"
          : `ลูกเต๋าออกแต้ม ${value ?? effectiveFrontValue}`)
      }
      aria-live={rolling ? "polite" : "off"}
    >
      {/* Soft 3D Floor Drop Shadow */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -bottom-4 w-[85%] h-6 rounded-full bg-[#040d26]/65 blur-md transition-transform duration-300",
          rolling && "scale-75 opacity-60",
        )}
      />

      {/* True 6-Sided 3D Cube Container */}
      <div
        className={cn(
          "relative w-full h-full",
          rolling
            ? "animate-dice-3d-tumble"
            : justLanded
            ? "animate-dice-3d-land"
            : undefined,
        )}
        style={{
          transformStyle: "preserve-3d",
          transform: rolling
            ? undefined
            : "rotateX(-18deg) rotateY(-25deg) rotateZ(3deg)",
        }}
      >
        {/* Inner solid core blocks to fill rounded corner seams in 3D */}
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-1 bg-[#bfd4ff]",
            faceRadiusClass,
          )}
          style={{ transform: "translateZ(0px)" }}
        />
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-1 bg-[#c9dcff]",
            faceRadiusClass,
          )}
          style={{ transform: "rotateY(90deg)" }}
        />
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-1 bg-[#e3eeff]",
            faceRadiusClass,
          )}
          style={{ transform: "rotateX(90deg)" }}
        />

        {/* FRONT FACE (Shows exact rolled value!) */}
        <div
          className={cn(
            "absolute inset-0 border-2 border-white/95 bg-gradient-to-br from-[#ffffff] via-[#f2f7ff] to-[#d4e4ff]",
            "shadow-[inset_0_3px_8px_rgba(255,255,255,0.95),inset_0_-6px_14px_rgba(125,162,235,0.45)]",
            faceRadiusClass,
          )}
          style={{
            transform: `translateZ(${halfPx}px)`,
            backfaceVisibility: "hidden",
          }}
        >
          <CubeFacePips
            faceValue={faces.front}
            pipSizeClass={pipSizeClass}
            paddingClass={paddingClass}
          />
        </div>

        {/* TOP FACE (Brightest top lighting) */}
        <div
          className={cn(
            "absolute inset-0 border-2 border-white bg-gradient-to-br from-[#ffffff] via-[#f8fbff] to-[#dfecff]",
            "shadow-[inset_0_2px_8px_rgba(255,255,255,1)]",
            faceRadiusClass,
          )}
          style={{
            transform: `rotateX(90deg) translateZ(${halfPx}px)`,
            backfaceVisibility: "hidden",
          }}
        >
          <CubeFacePips
            faceValue={faces.top}
            pipSizeClass={pipSizeClass}
            paddingClass={paddingClass}
          />
        </div>

        {/* RIGHT FACE (Shaded 3D side lighting) */}
        <div
          className={cn(
            "absolute inset-0 border-2 border-[#d8e7ff] bg-gradient-to-br from-[#dce9ff] via-[#bdd3fa] to-[#94b6f0]",
            "shadow-[inset_0_-6px_14px_rgba(52,96,184,0.35)]",
            faceRadiusClass,
          )}
          style={{
            transform: `rotateY(90deg) translateZ(${halfPx}px)`,
            backfaceVisibility: "hidden",
          }}
        >
          <CubeFacePips
            faceValue={faces.right}
            pipSizeClass={pipSizeClass}
            paddingClass={paddingClass}
          />
        </div>

        {/* LEFT FACE */}
        <div
          className={cn(
            "absolute inset-0 border-2 border-[#d8e7ff] bg-gradient-to-br from-[#e3eeff] to-[#a8c5f5]",
            faceRadiusClass,
          )}
          style={{
            transform: `rotateY(-90deg) translateZ(${halfPx}px)`,
            backfaceVisibility: "hidden",
          }}
        >
          <CubeFacePips
            faceValue={faces.left}
            pipSizeClass={pipSizeClass}
            paddingClass={paddingClass}
          />
        </div>

        {/* BOTTOM FACE */}
        <div
          className={cn(
            "absolute inset-0 border-2 border-[#b8cff7] bg-gradient-to-br from-[#b8cff7] to-[#84a8e8]",
            faceRadiusClass,
          )}
          style={{
            transform: `rotateX(-90deg) translateZ(${halfPx}px)`,
            backfaceVisibility: "hidden",
          }}
        >
          <CubeFacePips
            faceValue={faces.bottom}
            pipSizeClass={pipSizeClass}
            paddingClass={paddingClass}
          />
        </div>

        {/* BACK FACE */}
        <div
          className={cn(
            "absolute inset-0 border-2 border-[#d8e7ff] bg-gradient-to-br from-[#e8f1ff] to-[#b5cef7]",
            faceRadiusClass,
          )}
          style={{
            transform: `rotateY(180deg) translateZ(${halfPx}px)`,
            backfaceVisibility: "hidden",
          }}
        >
          <CubeFacePips
            faceValue={faces.back}
            pipSizeClass={pipSizeClass}
            paddingClass={paddingClass}
          />
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
 * Front face of the 3D cube is strictly bound to `value` so the pips on the dice
 * and the summary number below ALWAYS match 100%!
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

  const isFinishedRolling = !rolling && value !== null;

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
        if (isFinishedRolling) onClose();
      }}
    >
      {/* Decorative Sparkles & Radial Aura matching the reference image */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] sm:w-[460px] sm:h-[460px] rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] sm:w-[330px] sm:h-[330px] rounded-full border border-sky-300/20" />
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

      {/* Center Stage: True 3D Cube Dice + "ทอยลูกเต๋าแล้ว!" + Exact Matching Number */}
      <div
        className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-10 sm:mb-12">
          <Dice value={value} rolling={!isFinishedRolling} size="xl" />
        </div>

        {!isFinishedRolling ? (
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
        {isFinishedRolling &&
          "แตะที่หน้าจอหรือกดปุ่มเพื่อกลับไปดูตัวละครเดินบนกระดาน"}
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