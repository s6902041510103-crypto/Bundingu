"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const DICE_FACES = [
  [5], // 1
  [1, 9], // 2
  [1, 5, 9], // 3
  [1, 3, 7, 9], // 4
  [1, 3, 5, 7, 9], // 5
  [1, 2, 3, 7, 8, 9], // 6
];

const POSITIONS = {
  1: { x: 0, y: 0 },
  2: { x: 50, y: 0 },
  3: { x: 100, y: 0 },
  4: { x: 0, y: 50 },
  5: { x: 50, y: 50 },
  6: { x: 100, y: 50 },
  7: { x: 0, y: 100 },
  8: { x: 50, y: 100 },
  9: { x: 100, y: 100 },
};

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
  const [displayValue, setDisplayValue] = useState(value ?? 1);
  const [isRolling, setIsRolling] = useState(false);
  const rollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const diceRef = useRef<HTMLDivElement>(null);

  const sizeClasses = {
    sm: "w-14 h-14",
    md: "w-20 h-20",
    lg: "w-28 h-28",
    xl: "w-36 h-36",
  };

  const dotSizes = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-3 h-3",
    xl: "w-4 h-4",
  };

  useEffect(() => {
    if (rolling && !isRolling) {
      startRolling();
    }
  }, [rolling]);

  const startRolling = () => {
    setIsRolling(true);
    let rolls = 0;
    const maxRolls = 15;
    const baseInterval = 50;

    const roll = () => {
      const randomValue = Math.floor(Math.random() * 6) + 1;
      setDisplayValue(randomValue);
      rolls++;

      if (rolls < maxRolls) {
        const delay = baseInterval + rolls * 15;
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
    }
  }, [value, rolling]);

  useEffect(() => {
    return () => {
      if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current);
    };
  }, []);

  const faces = DICE_FACES[displayValue - 1] ?? DICE_FACES[0];

  return (
    <div
      ref={diceRef}
      className={cn(
        "relative inline-flex items-center justify-center rounded-2xl",
        "bg-gradient-to-br from-slate-100 to-slate-300",
        "shadow-inner shadow-slate-400/50",
        "border border-slate-300",
        "transition-all duration-200",
        isRolling && "animate-dice-shake",
        sizeClasses[size],
        className,
      )}
      role="img"
      aria-label={ariaLabel || (rolling ? "กำลังทอยลูกเต๋า" : `ลูกเต๋าแสดง ${displayValue}`)}
      aria-live={rolling ? "polite" : "off"}
    >
      <div className="relative w-full h-full p-1.5" style={{ aspectRatio: "1 / 1" }}>
        <div
          className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/80 to-slate-200/80"
          aria-hidden="true"
        />
        <div className="relative z-10 grid grid-cols-3 grid-rows-3 gap-1 w-full h-full">
          {Array.from({ length: 9 }, (_, i) => i + 1).map((pos) => (
            <div
              key={pos}
              className={cn(
                "flex items-center justify-center transition-all duration-150",
                faces.includes(pos) && "opacity-100",
                !faces.includes(pos) && "opacity-0 scale-50",
              )}
            >
              <span
                className={cn(
                  "rounded-full bg-slate-900",
                  dotSizes[size],
                  "shadow-sm shadow-slate-900/50",
                )}
                aria-hidden="true"
              />
            </div>
          ))}
        </div>
      </div>
      {rolling && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-amber-500 font-display font-bold animate-pulse-soft text-2xl">🎲</div>
        </div>
      )}
      {children && !rolling && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {children}
        </div>
      )}
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
        aria-label={rolling ? "กำลังทอยลูกเต๋า" : value ? `ได้ ${value}` : "ยังไม่ได้ทอย"}
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