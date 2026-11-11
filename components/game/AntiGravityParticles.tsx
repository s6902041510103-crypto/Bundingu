"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { SpecialCellKind } from "@/lib/types";

interface AntiGravityParticlesProps {
  kind: SpecialCellKind;
  active?: boolean;
  count?: number;
  className?: string;
}

const PARTICLE_THEMES: Record<
  SpecialCellKind,
  { colors: string[]; symbols: string[]; glow: string }
> = {
  start: {
    colors: ["#34d399", "#10b981", "#6ee7b7", "#ffffff"],
    symbols: ["🚀", "✦", "•"],
    glow: "drop-shadow(0 0 6px rgba(16,185,129,0.85))",
  },
  rocket: {
    colors: ["#c084fc", "#a855f7", "#38bdf8", "#f472b6"],
    symbols: ["🚀", "✦", "⚡", "•"],
    glow: "drop-shadow(0 0 6px rgba(168,85,247,0.85))",
  },
  magnet: {
    colors: ["#fb923c", "#f97316", "#facc15", "#f87171"],
    symbols: ["🧲", "✦", "⚡", "•"],
    glow: "drop-shadow(0 0 6px rgba(249,115,22,0.85))",
  },
  gem: {
    colors: ["#2dd4bf", "#38bdf8", "#a5f3fc", "#818cf8"],
    symbols: ["💎", "✦", "✧", "•"],
    glow: "drop-shadow(0 0 6px rgba(56,189,248,0.9))",
  },
  star: {
    colors: ["#fde047", "#facc15", "#fb923c", "#ffffff"],
    symbols: ["⭐", "✦", "✧", "•"],
    glow: "drop-shadow(0 0 6px rgba(250,204,21,0.9))",
  },
  boost: {
    colors: ["#facc15", "#fde047", "#38bdf8", "#ffffff"],
    symbols: ["⚡", "✦", "✧", "•"],
    glow: "drop-shadow(0 0 6px rgba(250,204,21,0.9))",
  },
  shield: {
    colors: ["#60a5fa", "#38bdf8", "#93c5fd", "#ffffff"],
    symbols: ["🛡️", "✦", "✧", "•"],
    glow: "drop-shadow(0 0 6px rgba(59,130,246,0.9))",
  },
  gift: {
    colors: ["#f472b6", "#ec4899", "#fde047", "#c084fc"],
    symbols: ["🎁", "✦", "✧", "•"],
    glow: "drop-shadow(0 0 6px rgba(236,72,153,0.9))",
  },
  finish: {
    colors: ["#fde047", "#f59e0b", "#34d399", "#f87171"],
    symbols: ["🏆", "✦", "★", "•"],
    glow: "drop-shadow(0 0 6px rgba(245,158,11,0.9))",
  },
};

/**
 * Anti-Gravity Floating Particle Emitter
 * Triggers when a player lands on a special boost cell (ROCKET, MAGNET, GEM, STAR, etc.)
 * Particles float upwards against gravity with organic horizontal drift and scale decay.
 */
export function AntiGravityParticles({
  kind,
  active = true,
  count = 10,
  className,
}: AntiGravityParticlesProps) {
  const theme = PARTICLE_THEMES[kind] ?? PARTICLE_THEMES.star;

  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      // Deterministic pseudo-random distribution per index
      const seed = (i + 1) * 137.5;
      const leftPercent = 12 + ((seed * 3.7) % 76);
      const driftPx = ((i % 2 === 0 ? 1 : -1) * (6 + ((seed * 1.9) % 14))).toFixed(1);
      const durationSec = (1.35 + ((seed * 0.43) % 0.95)).toFixed(2);
      const delaySec = ((i * 0.14) % 0.85).toFixed(2);
      const color = theme.colors[i % theme.colors.length];
      const symbol = theme.symbols[i % theme.symbols.length];
      const isSymbol = i % 3 === 0;

      return {
        id: i,
        leftPercent,
        driftPx,
        durationSec,
        delaySec,
        color,
        symbol,
        isSymbol,
      };
    });
  }, [count, theme]);

  if (!active) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 -top-6 bottom-0 overflow-visible z-40 select-none",
        className,
      )}
      aria-hidden="true"
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className=" absolute bottom-1 animate-antigravity-float"
          style={
            {
              left: `${p.leftPercent}%`,
              color: p.color,
              filter: theme.glow,
              "--ag-drift": `${p.driftPx}px`,
              animationDuration: `${p.durationSec}s`,
              animationDelay: `${p.delaySec}s`,
            } as React.CSSProperties
          }
        >
          {p.isSymbol ? (
            <span className="text-[9px] sm:text-xs font-bold leading-none block">
              {p.symbol}
            </span>
          ) : (
            <span
              className="block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full"
              style={{ backgroundColor: p.color }}
            />
          )}
        </span>
      ))}
    </div>
  );
}
