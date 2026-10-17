"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { BoardCell, SpecialCell } from "@/lib/types";
import { Avatar, AvatarGroup } from "./Avatar";

interface BoardCellProps {
  cell: BoardCell;
  cellSize: number;
  playersOnCell: Array<{ id: string; avatarId: string; name: string }>;
  currentPlayerId?: string | null;
  movingPlayerId?: string | null;
  highlightCell?: number | null;
  mode?: "game" | "preview";
}

export function BoardCellComponent({
  cell,
  cellSize,
  playersOnCell,
  currentPlayerId,
  movingPlayerId,
  highlightCell,
  mode = "game",
}: BoardCellProps) {
  const isHighlighted = highlightCell === cell.number;
  const isCurrentPlayer = playersOnCell.some((p) => p.id === currentPlayerId);
  const isMoving = movingPlayerId && playersOnCell.some((p) => p.id === movingPlayerId);

  const toneClasses = {
    light: "board-cell-light",
    dark: "board-cell-dark",
    start: "board-cell-start",
    finish: "board-cell-finish",
    special: "board-cell-special",
  };

  const specialIcons: Record<string, string> = {
    start: "🚩",
    finish: "🏁",
    star: "⭐",
    gift: "🎁",
    boost: "✨",
  };

  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        "rounded-lg border border-slate-300/50",
        "transition-all duration-200",
        "overflow-visible",
        toneClasses[cell.tone],
        isHighlighted && "ring-2 ring-amber-400 ring-offset-2 ring-offset-white shadow-lg shadow-amber-400/30",
        isCurrentPlayer && "ring-2 ring-sky-400 ring-offset-2 ring-offset-white",
        isMoving && "ring-2 ring-emerald-400 ring-offset-2 ring-offset-white",
      )}
      style={{
        width: cellSize,
        height: cellSize,
        fontSize: Math.max(10, cellSize * 0.35),
      } as React.CSSProperties}
      data-cell={cell.number}
      title={`ช่อง ${cell.number}${cell.special ? ` — ${cell.special.label}` : ""}`}
    >
      <span
        className={cn(
          "font-display font-bold select-none",
          "text-slate-700",
          cell.tone === "finish" && "text-red-700",
          cell.tone === "start" && "text-emerald-700",
          cell.tone === "special" && "text-amber-800",
        )}
      >
        {cell.number}
      </span>

      {cell.special && (
        <div
          className="absolute top-0.5 right-0.5 text-xs"
          aria-label={cell.special.label}
        >
          {specialIcons[cell.special.kind] || cell.special.emoji}
        </div>
      )}

      {playersOnCell.length > 0 && (
        <div
          className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-0.5"
          style={{ transform: "translateX(-50%)", maxWidth: cellSize * 0.9 }}
          aria-label={`${playersOnCell.length} ผู้เล่นบนช่องนี้`}
        >
          <AvatarGroup avatarIds={playersOnCell.map((p) => p.avatarId) as import("@/lib/types").AvatarId[]} maxVisible={4} size="xs" />
        </div>
      )}
    </div>
  );
}

interface SnakeOverlayProps {
  snakes: Array<{ from: number; to: number }>;
  cells: BoardCell[];
  boardSize: number;
  cellSize: number;
  animatedSnake?: { from: number; to: number; progress: number } | null;
}

export function SnakeOverlay({ snakes, cells, boardSize, cellSize, animatedSnake }: SnakeOverlayProps) {
  const cellMap = new Map(cells.map((c) => [c.number, c]));

  const getCellCenter = (num: number) => {
    const cell = cellMap.get(num);
    if (!cell) return { x: 0, y: 0 };
    return {
      x: cell.x * boardSize,
      y: (100 - cell.y) * boardSize, // flip Y for SVG
    };
  };

  const pathData = (from: number, to: number, progress = 1) => {
    const start = getCellCenter(from);
    const end = getCellCenter(to);
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2 - boardSize * 0.15; // curve upward
    const currX = start.x + (midX - start.x) * progress * 2;
    const currY = start.y + (midY - start.y) * progress * 2;
    // Simplified: just draw full path when progress > 0.5
    if (progress < 0.5) return "";
    return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
  };

  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ width: boardSize, height: boardSize }}
      viewBox={`0 0 ${boardSize} ${boardSize}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {snakes.map((snake) => {
        const isAnimated = animatedSnake?.from === snake.from && animatedSnake?.to === snake.to;
        const progress = isAnimated ? animatedSnake.progress : 1;
        const path = pathData(snake.from, snake.to, progress);
        if (!path) return null;

        return (
          <g key={`${snake.from}-${snake.to}`}>
            <path
              d={path}
              stroke="#ef4444"
              strokeWidth={Math.max(3, cellSize * 0.12)}
              strokeLinecap="round"
              fill="none"
              opacity={0.7}
              className="animate-snake-slide"
              style={{ strokeDasharray: 1000, strokeDashoffset: isAnimated ? 1000 * (1 - progress) : 0 }}
            />
            {/* Snake head */}
            {isAnimated && progress > 0.3 && (
              <circle
                cx={getCellCenter(snake.to).x}
                cy={getCellCenter(snake.to).y}
                r={Math.max(6, cellSize * 0.2)}
                fill="#ef4444"
                className="animate-bounce-in"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

interface LadderOverlayProps {
  ladders: Array<{ from: number; to: number }>;
  cells: BoardCell[];
  boardSize: number;
  cellSize: number;
  animatedLadder?: { from: number; to: number; progress: number } | null;
}

export function LadderOverlay({ ladders, cells, boardSize, cellSize, animatedLadder }: LadderOverlayProps) {
  const cellMap = new Map(cells.map((c) => [c.number, c]));

  const getCellCenter = (num: number) => {
    const cell = cellMap.get(num);
    if (!cell) return { x: 0, y: 0 };
    return {
      x: cell.x * boardSize,
      y: (100 - cell.y) * boardSize,
    };
  };

  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ width: boardSize, height: boardSize }}
      viewBox={`0 0 ${boardSize} ${boardSize}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {ladders.map((ladder) => {
        const isAnimated = animatedLadder?.from === ladder.from && animatedLadder?.to === ladder.to;
        const progress = isAnimated ? animatedLadder.progress : 1;
        const start = getCellCenter(ladder.from);
        const end = getCellCenter(ladder.to);
        const rungCount = Math.max(3, Math.round(Math.abs(ladder.to - ladder.from) / 10));

        return (
          <g key={`${ladder.from}-${ladder.to}`} style={{ opacity: progress }}>
            {/* Side rails */}
            <line
              x1={start.x - cellSize * 0.08}
              y1={start.y}
              x2={end.x - cellSize * 0.08}
              y2={end.y}
              stroke="#f59e0b"
              strokeWidth={Math.max(2, cellSize * 0.06)}
              strokeLinecap="round"
            />
            <line
              x1={start.x + cellSize * 0.08}
              y1={start.y}
              x2={end.x + cellSize * 0.08}
              y2={end.y}
              stroke="#f59e0b"
              strokeWidth={Math.max(2, cellSize * 0.06)}
              strokeLinecap="round"
            />
            {/* Rungs */}
            {Array.from({ length: rungCount }, (_, i) => i + 1).map((rung) => {
              const t = rung / (rungCount + 1);
              const x1 = start.x + (end.x - start.x) * t - cellSize * 0.08;
              const x2 = start.x + (end.x - start.x) * t + cellSize * 0.08;
              const y = start.y + (end.y - start.y) * t;
              return (
                <line
                  key={rung}
                  x1={x1}
                  y1={y}
                  x2={x2}
                  y2={y}
                  stroke="#d97706"
                  strokeWidth={Math.max(1.5, cellSize * 0.05)}
                  strokeLinecap="round"
                  style={{ transformOrigin: `${x1} ${y}`, transform: isAnimated ? `scaleX(${progress})` : undefined }}
                />
              );
            })}
            {/* Top glow */}
            {isAnimated && progress > 0.5 && (
              <circle
                cx={end.x}
                cy={end.y}
                r={Math.max(6, cellSize * 0.2)}
                fill="#fbbf24"
                className="animate-bounce-in"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}