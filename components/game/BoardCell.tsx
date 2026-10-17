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

// Vibrant fantasy board palette inspired by the reference UI
const PALETTE_CYCLE = [
  "bg-[#fef08a] text-amber-950", // warm yellow
  "bg-[#bae6fd] text-sky-950",   // sky blue
  "bg-[#bbf7d0] text-emerald-950", // mint green
  "bg-[#fed7aa] text-orange-950", // soft orange
  "bg-[#e9d5ff] text-purple-950", // lavender
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

  const colorClass =
    cell.tone === "start"
      ? "bg-gradient-to-br from-emerald-400 to-green-500 text-white ring-1 ring-inset ring-white/50"
      : cell.tone === "finish"
      ? "bg-gradient-to-br from-rose-500 via-red-500 to-orange-500 text-white ring-1 ring-inset ring-amber-200"
      : cell.tone === "special"
      ? "bg-gradient-to-br from-amber-300 to-yellow-400 text-amber-950 ring-1 ring-inset ring-amber-500/50"
      : PALETTE_CYCLE[(cell.number + cell.row) % PALETTE_CYCLE.length];

  const visiblePlayers = playersOnCell.slice(0, 3);
  const overflowCount = Math.max(0, playersOnCell.length - visiblePlayers.length);

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between p-0.5 sm:p-1 select-none",
        "border border-amber-900/15 transition-transform duration-150 overflow-visible",
        colorClass,
        isHighlighted && "ring-2 ring-amber-400 z-20 scale-[1.03]",
        isCurrentPlayerHere && "ring-2 ring-blue-500 z-20",
        isMovingHere && "ring-2 ring-emerald-400 z-20 scale-105",
      )}
      data-cell={cell.number}
      title={`ช่อง ${cell.number}${cell.special ? ` — ${cell.special.label}: ${cell.special.description}` : ""}${cell.snake ? ` (งู ${cell.snake.from}→${cell.snake.to})` : ""}${cell.ladder ? ` (บันได ${cell.ladder.from}→${cell.ladder.to})` : ""}`}
    >
      {/* Top Row: Square Number & Special Badge */}
      <div className="flex items-start justify-between w-full leading-none z-10">
        <span
          className={cn(
            "font-display font-extrabold text-[9px] sm:text-[11px] md:text-xs tracking-tighter drop-shadow-2xs",
            (cell.tone === "start" || cell.tone === "finish") && "text-white",
          )}
        >
          {cell.number}
        </span>

        {cell.special && cell.tone !== "start" && cell.tone !== "finish" && (
          <span
            className="text-[10px] sm:text-xs leading-none drop-shadow-xs"
            aria-label={cell.special.label}
          >
            {cell.special.emoji}
          </span>
        )}
      </div>

      {/* Start / Finish Banner Label */}
      {cell.tone === "start" && (
        <span className="text-[7px] sm:text-[9px] font-display font-black uppercase tracking-wider bg-black/20 px-1 rounded text-white self-center">
          START
        </span>
      )}
      {cell.tone === "finish" && (
        <span className="text-[7px] sm:text-[9px] font-display font-black uppercase tracking-wider bg-black/25 px-1 rounded text-amber-200 self-center">
          FINISH
        </span>
      )}

      {/* Snake Head / Ladder Foot subtle indicator */}
      {cell.snake && playersOnCell.length === 0 && (
        <span
          className="text-[9px] sm:text-[11px] self-end opacity-85 leading-none"
          aria-hidden="true"
        >
          🐍
        </span>
      )}
      {cell.ladder && playersOnCell.length === 0 && (
        <span
          className="text-[9px] sm:text-[11px] self-end opacity-85 leading-none"
          aria-hidden="true"
        >
          🪜
        </span>
      )}

      {/* Players on this Square — arranged neatly so multiple avatars never overlap unreadably */}
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

const SNAKE_COLORS = [
  { body: "#ef4444", stripe: "#fca5a5", head: "#dc2626" },
  { body: "#ec4899", stripe: "#f9a8d4", head: "#db2777" },
  { body: "#8b5cf6", stripe: "#c4b5fd", head: "#7c3aed" },
  { body: "#f97316", stripe: "#fdba74", head: "#ea580c" },
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
      {snakes.map((snake, idx) => {
        const start = cellMap.get(snake.from);
        const end = cellMap.get(snake.to);
        if (!start || !end) return null;

        const palette = SNAKE_COLORS[idx % SNAKE_COLORS.length];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const mid1X = start.x + dx * 0.33 + (idx % 2 === 0 ? 7 : -7);
        const mid1Y = start.y + dy * 0.33;
        const mid2X = start.x + dx * 0.66 + (idx % 2 === 0 ? -7 : 7);
        const mid2Y = start.y + dy * 0.66;

        const d = `M ${start.x} ${start.y} C ${mid1X} ${mid1Y}, ${mid2X} ${mid2Y}, ${end.x} ${end.y}`;

        return (
          <g key={`snake-${snake.from}-${snake.to}`} opacity={0.9}>
            {/* Shadow */}
            <path
              d={d}
              stroke="rgba(15, 23, 42, 0.25)"
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
              transform="translate(0.4, 0.6)"
            />
            {/* Snake Body */}
            <path
              d={d}
              stroke={palette.body}
              strokeWidth="2.1"
              strokeLinecap="round"
              fill="none"
            />
            {/* Snake Stripes */}
            <path
              d={d}
              stroke={palette.stripe}
              strokeWidth="1.2"
              strokeDasharray="1.6 2.2"
              strokeLinecap="round"
              fill="none"
            />
            {/* Snake Head at `from` square */}
            <circle cx={start.x} cy={start.y} r="2.2" fill={palette.head} />
            <circle cx={start.x - 0.6} cy={start.y - 0.5} r="0.45" fill="#ffffff" />
            <circle cx={start.x + 0.6} cy={start.y - 0.5} r="0.45" fill="#ffffff" />
            {/* Snake Tail tip at `to` square */}
            <circle cx={end.x} cy={end.y} r="1.1" fill={palette.body} />
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
      {ladders.map((ladder) => {
        const start = cellMap.get(ladder.from);
        const end = cellMap.get(ladder.to);
        if (!start || !end) return null;

        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const len = Math.hypot(dx, dy) || 1;
        // Normal vector for parallel rails
        const nx = (-dy / len) * 1.35;
        const ny = (dx / len) * 1.35;

        const rungs = Math.max(4, Math.round(len / 5.5));

        return (
          <g key={`ladder-${ladder.from}-${ladder.to}`} opacity={0.92}>
            {/* Rail shadows */}
            <line
              x1={start.x - nx + 0.3}
              y1={start.y - ny + 0.5}
              x2={end.x - nx + 0.3}
              y2={end.y - ny + 0.5}
              stroke="rgba(15, 23, 42, 0.22)"
              strokeWidth="1.1"
              strokeLinecap="round"
            />
            <line
              x1={start.x + nx + 0.3}
              y1={start.y + ny + 0.5}
              x2={end.x + nx + 0.3}
              y2={end.y + ny + 0.5}
              stroke="rgba(15, 23, 42, 0.22)"
              strokeWidth="1.1"
              strokeLinecap="round"
            />
            {/* Wooden/Golden Rails */}
            <line
              x1={start.x - nx}
              y1={start.y - ny}
              x2={end.x - nx}
              y2={end.y - ny}
              stroke="#d97706"
              strokeWidth="1.05"
              strokeLinecap="round"
            />
            <line
              x1={start.x + nx}
              y1={start.y + ny}
              x2={end.x + nx}
              y2={end.y + ny}
              stroke="#d97706"
              strokeWidth="1.05"
              strokeLinecap="round"
            />
            {/* Rungs */}
            {Array.from({ length: rungs }, (_, i) => i + 1).map((step) => {
              const t = step / (rungs + 1);
              const cx = start.x + dx * t;
              const cy = start.y + dy * t;
              return (
                <line
                  key={step}
                  x1={cx - nx}
                  y1={cy - ny}
                  x2={cx + nx}
                  y2={cy + ny}
                  stroke="#f59e0b"
                  strokeWidth="0.85"
                  strokeLinecap="round"
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}