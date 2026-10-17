"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { buildBoardCells } from "@/lib/board";
import { SNAKES, LADDERS, SPECIAL_CELLS } from "@/lib/game-data";
import type { BoardCell, Player } from "@/lib/types";
import { BoardCellComponent, SnakeOverlay, LadderOverlay } from "./BoardCell";

interface GameBoardProps {
  cells: BoardCell[];
  players: Player[];
  currentPlayerId?: string | null;
  movingPlayerId?: string | null;
  movementPath?: number[];
  highlightCell?: number | null;
  mode?: "game" | "preview";
  className?: string;
}

export function GameBoard({
  cells,
  players,
  currentPlayerId,
  movingPlayerId,
  movementPath,
  highlightCell,
  mode = "game",
  className,
}: GameBoardProps) {
  // Group players by board square (1..100)
  const playersByCell = useMemo(() => {
    const map = new Map<number, Array<{ id: string; avatarId: string; name: string }>>();
    players.forEach((player) => {
      const pos = Math.max(1, Math.min(100, player.position || 1));
      const existing = map.get(pos) || [];
      existing.push({ id: player.id, avatarId: player.avatarId, name: player.name });
      map.set(pos, existing);
    });
    return map;
  }, [players]);

  // Keep visual row order (top row 9 down to bottom row 0) and left-to-right column order (0 to 9).
  // `buildBoardCells` already assigns boustrophedon numbers (1..10, 20..11, ..., 100..91) per (row, col).
  const orderedCells = useMemo(() => {
    return [...cells].sort((a, b) => {
      if (a.row !== b.row) return b.row - a.row;
      return a.col - b.col;
    });
  }, [cells]);

  return (
    <div
      className={cn(
        "relative w-full aspect-square rounded-2xl sm:rounded-3xl p-1.5 sm:p-2.5",
        "bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-700 shadow-2xl border-2 border-amber-300/80",
        className,
      )}
      role="region"
      aria-label="กระดานเกม 100 ช่อง แบบ Snake & Ladder"
    >
      <div className="relative w-full h-full rounded-xl sm:rounded-2xl overflow-hidden bg-amber-50 border-2 border-amber-900/30">
        {/* Cells 10x10 Grid */}
        <div
          className="absolute inset-0 grid grid-cols-10 grid-rows-10 w-full h-full"
          role="grid"
          aria-label="ช่องกระดาน 1 ถึง 100"
        >
          {orderedCells.map((cell) => (
            <BoardCellComponent
              key={cell.number}
              cell={cell}
              playersOnCell={playersByCell.get(cell.number) || []}
              currentPlayerId={currentPlayerId}
              movingPlayerId={movingPlayerId}
              highlightCell={highlightCell}
              mode={mode}
            />
          ))}
        </div>

        {/* Ladder SVG Overlay */}
        <LadderOverlay ladders={LADDERS} cells={cells} />

        {/* Snake SVG Overlay */}
        <SnakeOverlay snakes={SNAKES} cells={cells} />

        {/* Active Movement Path Indicator */}
        {mode === "game" && movementPath && movementPath.length > 1 && (
          <MovementPathIndicator path={movementPath} cells={cells} />
        )}
      </div>
    </div>
  );
}

function MovementPathIndicator({
  path,
  cells,
}: {
  path: number[];
  cells: BoardCell[];
}) {
  const cellMap = new Map(cells.map((c) => [c.number, c]));
  const points = path
    .map((num) => cellMap.get(num))
    .filter((c): c is BoardCell => Boolean(c));

  if (points.length < 2) return null;

  const pathData = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const last = points[points.length - 1];

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-20"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={pathData}
        stroke="#2563eb"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray="2 1.5"
      />
      <circle cx={last.x} cy={last.y} r="2" fill="#2563eb" />
    </svg>
  );
}

interface GameBoardWrapperProps {
  players: Player[];
  currentPlayerId?: string | null;
  movingPlayerId?: string | null;
  movementPath?: number[];
  highlightCell?: number | null;
  mode?: "game" | "preview";
  className?: string;
  responsive?: boolean;
}

export function GameBoardWrapper({
  players,
  currentPlayerId,
  movingPlayerId,
  movementPath,
  highlightCell,
  mode = "game",
  className,
}: GameBoardWrapperProps) {
  const cells = useMemo(
    () =>
      buildBoardCells({
        snakes: SNAKES,
        ladders: LADDERS,
        specialCells: SPECIAL_CELLS,
      }),
    [],
  );

  return (
    <div className={cn("w-full max-w-full flex items-center justify-center", className)}>
      <GameBoard
        cells={cells}
        players={players}
        currentPlayerId={currentPlayerId}
        movingPlayerId={movingPlayerId}
        movementPath={movementPath}
        highlightCell={highlightCell}
        mode={mode}
      />
    </div>
  );
}