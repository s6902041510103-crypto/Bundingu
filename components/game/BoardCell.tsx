"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { AvatarId, BoardCell } from "@/lib/types";
import { Avatar } from "./Avatar";

interface BoardCellProps {
  cell: BoardCell;
  playersOnCell: Array<{ id: string; avatarId: string; name: string }>;
  currentPlayerId?: string | null;
  movingPlayerId?: string | null;
  highlightCell?: number | null;
  mode?: "game" | "preview";
}

// Rich 3D fantasy board tile palette
const PALETTE_CYCLE = [
  "bg-gradient-to-b from-[#fef08a] to-[#fde047] text-amber-950 border-amber-300/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),inset_0_-1px_1px_rgba(0,0,0,0.08)]", // warm sunshine gold
  "bg-gradient-to-b from-[#bae6fd] to-[#7dd3fc] text-sky-950 border-sky-300/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),inset_0_-1px_1px_rgba(0,0,0,0.08)]",     // crystal sky blue
  "bg-gradient-to-b from-[#bbf7d0] to-[#86efac] text-emerald-950 border-emerald-300/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),inset_0_-1px_1px_rgba(0,0,0,0.08)]", // spring meadow green
  "bg-gradient-to-b from-[#fed7aa] to-[#fdba74] text-orange-950 border-orange-300/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),inset_0_-1px_1px_rgba(0,0,0,0.08)]",   // sunset peach
  "bg-gradient-to-b from-[#e9d5ff] to-[#d8b4fe] text-purple-950 border-purple-300/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),inset_0_-1px_1px_rgba(0,0,0,0.08)]",   // royal lilac
];

export function BoardCellComponent({
  cell,
  playersOnCell,
  currentPlayerId,
  movingPlayerId,
  highlightCell,
}: BoardCellProps) {
  const isHighlighted = highlightCell === cell.number;
  const isCurrentPlayerHere = playersOnCell.some((p) => p.id === currentPlayerId);
  const isMovingHere = Boolean(
    movingPlayerId && playersOnCell.some((p) => p.id === movingPlayerId),
  );

  let colorClass = PALETTE_CYCLE[(cell.number + cell.row) % PALETTE_CYCLE.length];

  if (cell.tone === "start") {
    colorClass =
      "bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.5),0_2px_8px_rgba(16,185,129,0.35)] border-emerald-300";
  } else if (cell.tone === "finish") {
    colorClass =
      "bg-gradient-to-br from-amber-400 via-rose-500 to-red-600 text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.6),0_2px_10px_rgba(239,68,68,0.45)] border-amber-300 animate-pulse";
  } else if (cell.special) {
    switch (cell.special.kind) {
      case "shield":
        colorClass =
          "bg-gradient-to-br from-sky-300 via-blue-400 to-indigo-500 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] border-sky-300";
        break;
      case "gem":
        colorClass =
          "bg-gradient-to-br from-teal-200 via-cyan-400 to-blue-500 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] border-cyan-300";
        break;
      case "star":
        colorClass =
          "bg-gradient-to-br from-amber-200 via-yellow-300 to-orange-400 text-amber-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] border-yellow-300";
        break;
      case "gift":
        colorClass =
          "bg-gradient-to-br from-rose-200 via-pink-400 to-purple-500 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] border-pink-300";
        break;
      case "rocket":
        colorClass =
          "bg-gradient-to-br from-violet-300 via-purple-500 to-indigo-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] border-purple-300";
        break;
      case "magnet":
        colorClass =
          "bg-gradient-to-br from-red-300 via-orange-400 to-amber-500 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] border-orange-300";
        break;
      case "boost":
        colorClass =
          "bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-500 text-amber-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] border-amber-300";
        break;
      default:
        colorClass =
          "bg-gradient-to-br from-amber-300 to-yellow-400 text-amber-950 border-amber-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]";
    }
  }

  const visiblePlayers = playersOnCell.slice(0, 3);
  const overflowCount = Math.max(0, playersOnCell.length - visiblePlayers.length);

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between p-0.5 sm:p-1 select-none",
        "border transition-transform duration-150 overflow-visible",
        colorClass,
        isHighlighted && "ring-2 ring-amber-400 z-20 scale-[1.03]",
        isCurrentPlayerHere && "ring-2 ring-blue-500 z-20",
        isMovingHere && "ring-2 ring-emerald-400 z-20 scale-105",
      )}
      data-cell={cell.number}
      title={`ช่อง ${cell.number}${cell.special ? ` — ${cell.special.label}: ${cell.special.description}` : ""}${cell.snake ? ` (งู ${cell.snake.from}→${cell.snake.to})` : ""}${cell.ladder ? ` (บันได ${cell.ladder.from}→${cell.ladder.to})` : ""}`}
    >
      {/* Top Row: Square Number & Special Item Emblem */}
      <div className="flex items-start justify-between w-full leading-none z-10">
        <span
          className={cn(
            "font-display font-black text-[9px] sm:text-[11px] md:text-xs tracking-tighter drop-shadow-xs",
            (cell.tone === "start" || cell.tone === "finish" || (cell.special && cell.special.kind !== "star" && cell.special.kind !== "boost")) && "text-white",
          )}
        >
          {cell.number}
        </span>

        {cell.special && cell.tone !== "start" && cell.tone !== "finish" && (
          <div className="relative group/item flex items-center justify-center">
            <span
              className="text-xs sm:text-sm md:text-base leading-none drop-shadow-md transition-transform duration-200 hover:scale-125 cursor-help"
              aria-label={cell.special.label}
            >
              {cell.special.emoji}
            </span>
          </div>
        )}
      </div>

      {/* Start / Finish / Special Banner Label */}
      {cell.tone === "start" && (
        <span className="text-[7px] sm:text-[9px] font-display font-black uppercase tracking-wider bg-black/25 px-1 py-0.5 rounded text-white self-center shadow-xs">
          START
        </span>
      )}
      {cell.tone === "finish" && (
        <span className="text-[7px] sm:text-[9px] font-display font-black uppercase tracking-wider bg-black/35 px-1 py-0.5 rounded text-amber-200 self-center shadow-xs">
          FINISH 🏆
        </span>
      )}

      {/* Special Item Mini-Pill Badge */}
      {cell.special && cell.tone !== "start" && cell.tone !== "finish" && playersOnCell.length === 0 && (
        <span className="text-[6px] sm:text-[8px] font-display font-bold uppercase tracking-tight bg-black/20 text-white px-1 rounded-sm self-center leading-tight">
          {cell.special.label}
        </span>
      )}

      {/* Subtle indicator for snake head / ladder foot if unoccupied */}
      {cell.snake && playersOnCell.length === 0 && !cell.special && (
        <span
          className="text-[9px] sm:text-[11px] self-end opacity-75 leading-none"
          aria-hidden="true"
        >
          🐍
        </span>
      )}
      {cell.ladder && playersOnCell.length === 0 && !cell.special && (
        <span
          className="text-[9px] sm:text-[11px] self-end opacity-75 leading-none"
          aria-hidden="true"
        >
          🪜
        </span>
      )}

      {/* Players on this Square */}
      {playersOnCell.length > 0 && (
        <div
          className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none p-0.5"
          aria-label={`ผู้เล่นบนช่องที่ ${cell.number}: ${playersOnCell.map((p) => p.name).join(", ")}`}
        >
          <div
            className={cn(
              "flex items-center justify-center flex-wrap gap-0.5",
              playersOnCell.length === 1 ? "scale-100" : " -space-x-1.5",
            )}
          >
            {visiblePlayers.map((player) => {
              const isMoving = player.id === movingPlayerId;
              return (
                <div
                  key={player.id}
                  className={cn(
                    "relative rounded-full transition-transform duration-300",
                    isMoving && "animate-bounce-in scale-110",
                  )}
                >
                  <Avatar
                    avatarId={player.avatarId as AvatarId}
                    size="xs"
                    className={cn(
                      "w-4 h-4 sm:w-6 sm:h-6 text-[10px] sm:text-xs border border-white shadow-md",
                      player.id === currentPlayerId && "ring-2 ring-amber-400",
                    )}
                  />
                </div>
              );
            })}
            {overflowCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-slate-900 text-amber-300 font-display font-bold text-[8px] sm:text-[10px] border border-white shadow">
                +{overflowCount}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface SnakeOverlayProps {
  snakes: Array<{ from: number; to: number }>;
  cells: BoardCell[];
}

// 4 distinct vibrant 3D snakes
const SNAKE_3D_THEMES = [
  {
    id: "emerald",
    stroke: "url(#snake-grad-emerald)",
    highlight: "rgba(255, 255, 255, 0.75)",
    belly: "#fde047",
    headColor: "#059669",
    eyeColor: "#fef08a",
    pupil: "#0f172a",
    tongue: "#dc2626",
  },
  {
    id: "ruby",
    stroke: "url(#snake-grad-ruby)",
    highlight: "rgba(255, 255, 255, 0.75)",
    belly: "#fdba74",
    headColor: "#dc2626",
    eyeColor: "#fef08a",
    pupil: "#0f172a",
    tongue: "#ef4444",
  },
  {
    id: "amethyst",
    stroke: "url(#snake-grad-amethyst)",
    highlight: "rgba(255, 255, 255, 0.75)",
    belly: "#f472b6",
    headColor: "#7c3aed",
    eyeColor: "#fef08a",
    pupil: "#0f172a",
    tongue: "#e11d48",
  },
  {
    id: "golden",
    stroke: "url(#snake-grad-golden)",
    highlight: "rgba(255, 255, 255, 0.75)",
    belly: "#fef08a",
    headColor: "#ea580c",
    eyeColor: "#ffffff",
    pupil: "#0f172a",
    tongue: "#b91c1c",
  },
];

export function SnakeOverlay({ snakes, cells }: SnakeOverlayProps) {
  const cellMap = new Map(cells.map((c) => [c.number, c]));

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        {/* Drop shadow filter for 3D depth */}
        <filter id="snake-depth-shadow" x="-20%" y="-20%" width="150%" height="150%">
          <feDropShadow dx="0.6" dy="1.0" stdDeviation="0.6" floodColor="#091428" floodOpacity="0.4" />
        </filter>

        {/* 3D Multi-Stop Linear Gradients */}
        <linearGradient id="snake-grad-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#047857" />
          <stop offset="35%" stopColor="#10b981" />
          <stop offset="65%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#065f46" />
        </linearGradient>

        <linearGradient id="snake-grad-ruby" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#991b1b" />
          <stop offset="35%" stopColor="#ef4444" />
          <stop offset="65%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>

        <linearGradient id="snake-grad-amethyst" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#581c87" />
          <stop offset="35%" stopColor="#9333ea" />
          <stop offset="65%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#6b21a8" />
        </linearGradient>

        <linearGradient id="snake-grad-golden" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9a3412" />
          <stop offset="35%" stopColor="#ea580c" />
          <stop offset="65%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>
      </defs>

      {snakes.map((snake, idx) => {
        const start = cellMap.get(snake.from);
        const end = cellMap.get(snake.to);
        if (!start || !end) return null;

        const theme = SNAKE_3D_THEMES[idx % SNAKE_3D_THEMES.length];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const curveOffset = idx % 2 === 0 ? 8 : -8;
        const mid1X = start.x + dx * 0.33 + curveOffset;
        const mid1Y = start.y + dy * 0.33;
        const mid2X = start.x + dx * 0.66 - curveOffset;
        const mid2Y = start.y + dy * 0.66;

        const d = `M ${start.x} ${start.y} C ${mid1X} ${mid1Y}, ${mid2X} ${mid2Y}, ${end.x} ${end.y}`;

        // Angle for snake head pointing slightly along initial curve
        const headAngle = (Math.atan2(mid1Y - start.y, mid1X - start.x) * 180) / Math.PI;

        return (
          <g key={`snake-${snake.from}-${snake.to}`}>
            {/* 1. Deep 3D Ambient Shadow */}
            <path
              d={d}
              stroke="rgba(15, 23, 42, 0.4)"
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
              transform="translate(0.5, 0.8)"
            />

            {/* 2. Dark Volumetric Contour Body */}
            <path
              d={d}
              stroke="#0f172a"
              strokeWidth="2.7"
              strokeLinecap="round"
              fill="none"
            />

            {/* 3. 3D Gradient Snake Body */}
            <path
              d={d}
              stroke={theme.stroke}
              strokeWidth="2.3"
              strokeLinecap="round"
              fill="none"
            />

            {/* 4. Diamond / Scale Ribs Texture */}
            <path
              d={d}
              stroke={theme.belly}
              strokeWidth="1.2"
              strokeDasharray="1.2 2.2"
              strokeLinecap="round"
              fill="none"
              opacity={0.85}
            />

            {/* 5. Specular 3D Sunlight Highlight along the spine */}
            <path
              d={d}
              stroke={theme.highlight}
              strokeWidth="0.75"
              strokeLinecap="round"
              fill="none"
              opacity={0.7}
            />

            {/* 6. Coiled 3D Tail at `to` cell */}
            <circle cx={end.x} cy={end.y} r="1.3" fill="#0f172a" />
            <circle cx={end.x} cy={end.y} r="1.1" fill={theme.headColor} />
            <circle cx={end.x} cy={end.y} r="0.6" fill={theme.belly} />

            {/* 7. Expressive 3D Snake Head at `from` cell */}
            <g transform={`translate(${start.x}, ${start.y}) rotate(${headAngle + 90})`}>
              {/* Flicking Forked Tongue */}
              <path
                d="M 0 2.5 L 0 4.2 L -0.6 5.2 M 0 4.2 L 0.6 5.2"
                stroke={theme.tongue}
                strokeWidth="0.45"
                strokeLinecap="round"
                fill="none"
              />

              {/* Head Base Shadow */}
              <ellipse cx="0" cy="0.4" rx="2.5" ry="2.7" fill="#0f172a" opacity={0.6} />

              {/* Sculpted Head */}
              <ellipse cx="0" cy="0" rx="2.4" ry="2.6" fill={theme.headColor} stroke="#0f172a" strokeWidth="0.4" />

              {/* Snout highlight */}
              <ellipse cx="0" cy="1.2" rx="1.5" ry="1.0" fill={theme.belly} opacity={0.8} />

              {/* Left Eye */}
              <circle cx="-1.1" cy="-0.3" r="0.75" fill={theme.eyeColor} stroke="#0f172a" strokeWidth="0.25" />
              <ellipse cx="-1.1" cy="-0.3" rx="0.2" ry="0.5" fill={theme.pupil} />
              <circle cx="-1.25" cy="-0.5" r="0.2" fill="#ffffff" />

              {/* Right Eye */}
              <circle cx="1.1" cy="-0.3" r="0.75" fill={theme.eyeColor} stroke="#0f172a" strokeWidth="0.25" />
              <ellipse cx="1.1" cy="-0.3" rx="0.2" ry="0.5" fill={theme.pupil} />
              <circle cx="0.95" cy="-0.5" r="0.2" fill="#ffffff" />

              {/* Nostrils */}
              <circle cx="-0.4" cy="1.6" r="0.15" fill="#0f172a" />
              <circle cx="0.4" cy="1.6" r="0.15" fill="#0f172a" />
            </g>
          </g>
        );
      })}
    </svg>
  );
}

interface LadderOverlayProps {
  ladders: Array<{ from: number; to: number }>;
  cells: BoardCell[];
}

export function LadderOverlay({ ladders, cells }: LadderOverlayProps) {
  const cellMap = new Map(cells.map((c) => [c.number, c]));

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        {/* Ladder 3D golden wood gradients */}
        <linearGradient id="ladder-rail-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#78350f" />
          <stop offset="35%" stopColor="#f59e0b" />
          <stop offset="65%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>

        <linearGradient id="ladder-rung-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#92400e" />
          <stop offset="45%" stopColor="#fde047" />
          <stop offset="70%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
      </defs>

      {ladders.map((ladder) => {
        const start = cellMap.get(ladder.from);
        const end = cellMap.get(ladder.to);
        if (!start || !end) return null;

        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const len = Math.hypot(dx, dy) || 1;
        // Normal vector for parallel rails
        const nx = (-dy / len) * 1.4;
        const ny = (dx / len) * 1.4;

        const rungs = Math.max(4, Math.round(len / 5.5));

        return (
          <g key={`ladder-${ladder.from}-${ladder.to}`}>
            {/* 1. Deep 3D Shadow under rails */}
            <line
              x1={start.x - nx + 0.4}
              y1={start.y - ny + 0.7}
              x2={end.x - nx + 0.4}
              y2={end.y - ny + 0.7}
              stroke="rgba(15, 23, 42, 0.35)"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <line
              x1={start.x + nx + 0.4}
              y1={start.y + ny + 0.7}
              x2={end.x + nx + 0.4}
              y2={end.y + ny + 0.7}
              stroke="rgba(15, 23, 42, 0.35)"
              strokeWidth="1.3"
              strokeLinecap="round"
            />

            {/* 2. Dark Outline for volume */}
            <line
              x1={start.x - nx}
              y1={start.y - ny}
              x2={end.x - nx}
              y2={end.y - ny}
              stroke="#451a03"
              strokeWidth="1.45"
              strokeLinecap="round"
            />
            <line
              x1={start.x + nx}
              y1={start.y + ny}
              x2={end.x + nx}
              y2={end.y + ny}
              stroke="#451a03"
              strokeWidth="1.45"
              strokeLinecap="round"
            />

            {/* 3. 3D Golden Bamboo Rails */}
            <line
              x1={start.x - nx}
              y1={start.y - ny}
              x2={end.x - nx}
              y2={end.y - ny}
              stroke="url(#ladder-rail-gold)"
              strokeWidth="1.15"
              strokeLinecap="round"
            />
            <line
              x1={start.x + nx}
              y1={start.y + ny}
              x2={end.x + nx}
              y2={end.y + ny}
              stroke="url(#ladder-rail-gold)"
              strokeWidth="1.15"
              strokeLinecap="round"
            />

            {/* 4. 3D Rungs with golden metal brackets */}
            {Array.from({ length: rungs }, (_, i) => i + 1).map((step) => {
              const t = step / (rungs + 1);
              const cx = start.x + dx * t;
              const cy = start.y + dy * t;
              return (
                <g key={step}>
                  {/* Rung Shadow */}
                  <line
                    x1={cx - nx + 0.2}
                    y1={cy - ny + 0.5}
                    x2={cx + nx + 0.2}
                    y2={cy + ny + 0.5}
                    stroke="rgba(15, 23, 42, 0.3)"
                    strokeWidth="1.1"
                    strokeLinecap="round"
                  />
                  {/* Rung Outline */}
                  <line
                    x1={cx - nx}
                    y1={cy - ny}
                    x2={cx + nx}
                    y2={cy + ny}
                    stroke="#451a03"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                  />
                  {/* 3D Golden Rung */}
                  <line
                    x1={cx - nx}
                    y1={cy - ny}
                    x2={cx + nx}
                    y2={cy + ny}
                    stroke="url(#ladder-rung-gold)"
                    strokeWidth="0.95"
                    strokeLinecap="round"
                  />
                  {/* Metal joint bolts */}
                  <circle cx={cx - nx} cy={cy - ny} r="0.45" fill="#fef08a" stroke="#78350f" strokeWidth="0.2" />
                  <circle cx={cx + nx} cy={cy + ny} r="0.45" fill="#fef08a" stroke="#78350f" strokeWidth="0.2" />
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}