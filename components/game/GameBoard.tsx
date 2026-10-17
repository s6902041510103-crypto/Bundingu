"use client";

import React, { useMemo, useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { buildBoardCells, numberToPosition } from "@/lib/board";
import { SNAKES, LADDERS, SPECIAL_CELLS } from "@/lib/game-data";
import type { BoardCell, Player } from "@/lib/types";
import { BoardCellComponent, SnakeOverlay, LadderOverlay } from "./BoardCell";
import { Avatar } from "./Avatar";

interface GameBoardProps {
  cells: BoardCell[];
  players: Player[];
  boardSize: number;
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
  boardSize,
  currentPlayerId,
  movingPlayerId,
  movementPath,
  highlightCell,
  mode = "game",
  className,
}: GameBoardProps) {
  const cellSize = boardSize / 10;

  // Group players by position
  const playersByCell = useMemo(() => {
    const map = new Map<number, Array<{ id: string; avatarId: string; name: string }>>();
    players.forEach((player) => {
      if (player.position >= 1 && player.position <= 100) {
        const existing = map.get(player.position) || [];
        existing.push({ id: player.id, avatarId: player.avatarId, name: player.name });
        map.set(player.position, existing);
      }
    });
    return map;
  }, [players]);

  // Sort cells for rendering (visual order: top row first, alternating columns)
  const sortedCells = useMemo(() => {
    return [...cells].sort((a, b) => {
      if (a.row !== b.row) return b.row - a.row; // Top row first
      return a.row % 2 === 0 ? a.col - b.col : b.col - a.col;
    });
  }, [cells]);

  return (
    <div
      className={cn("relative", className)}
      style={{ width: boardSize, height: boardSize }}
      role="img"
      aria-label="กระดานเกม 100 ช่อง แบบ Snake & Ladder"
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100"
        style={{ boxShadow: "inset 0 0 0 1px #e2e8f0, 0 4px 24px -4px rgb(0 0 0 / 0.1)" }}
      />

      {/* Snake overlay */}
      <SnakeOverlay
        snakes={SNAKES}
        cells={cells}
        boardSize={boardSize}
        cellSize={cellSize}
      />

      {/* Ladder overlay */}
      <LadderOverlay
        ladders={LADDERS}
        cells={cells}
        boardSize={boardSize}
        cellSize={cellSize}
      />

      {/* Cells grid */}
      <div
        className="absolute inset-0 grid grid-cols-10 grid-rows-10"
        style={{ width: boardSize, height: boardSize }}
        role="grid"
        aria-label="ช่อง 1 ถึง 100"
      >
        {sortedCells.map((cell) => (
          <BoardCellComponent
            key={cell.number}
            cell={cell}
            cellSize={cellSize}
            playersOnCell={playersByCell.get(cell.number) || []}
            currentPlayerId={currentPlayerId}
            movingPlayerId={movingPlayerId}
            highlightCell={highlightCell}
            mode={mode}
          />
        ))}
      </div>

      {/* Start/Finish labels */}
      <div className="absolute -top-8 left-0 text-xs font-medium text-slate-500">เริ่ม</div>
      <div className="absolute -bottom-8 right-0 text-xs font-medium text-slate-500 text-right">เส้นชัย</div>

      {/* Movement path indicator */}
      {mode === "game" && movementPath && movementPath.length > 0 && (
        <MovementPathIndicator
          path={movementPath}
          cells={cells}
          boardSize={boardSize}
          cellSize={cellSize}
        />
      )}
    </div>
  );
}

interface MovementPathIndicatorProps {
  path: number[];
  cells: BoardCell[];
  boardSize: number;
  cellSize: number;
}

function MovementPathIndicator({ path, cells, boardSize, cellSize }: MovementPathIndicatorProps) {
  const cellMap = new Map(cells.map((c) => [c.number, c]));

  const points = path.map((num) => {
    const cell = cellMap.get(num);
    if (!cell) return null;
    return {
      x: cell.x * boardSize,
      y: (100 - cell.y) * boardSize,
    };
  }).filter((p): p is { x: number; y: number } => p !== null);

  if (points.length < 2) return null;

  const pathData = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ width: boardSize, height: boardSize }}
      viewBox={`0 0 ${boardSize} ${boardSize}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={pathData}
        stroke="#3b82f6"
        strokeWidth={Math.max(2, cellSize * 0.08)}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={0.6}
        strokeDasharray="8 4"
        className="animate-pulse-soft"
      />
      {/* Current step marker */}
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r={Math.max(5, cellSize * 0.15)}
          fill="#3b82f6"
          className="animate-bounce-in"
        />
      )}
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
  responsive = true,
}: GameBoardWrapperProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const boardSize = responsive
    ? Math.min(containerWidth || 400, 600)
    : 500;

  // Build cells
  const cells = useMemo(() => buildBoardCells({ snakes: SNAKES, ladders: LADDERS, specialCells: SPECIAL_CELLS }), []);

  if (boardSize === 0) {
    return (
      <div ref={containerRef} className={cn("w-full aspect-square", className)} aria-busy="true">
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/50 rounded-2xl">
          <div className="animate-pulse-soft text-slate-400">กำลังโหลดกระดาน...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("w-full aspect-square flex items-center justify-center", className)}
    >
      <GameBoard
        cells={cells}
        players={players}
        boardSize={boardSize}
        currentPlayerId={currentPlayerId}
        movingPlayerId={movingPlayerId}
        movementPath={movementPath}
        highlightCell={highlightCell}
        mode={mode}
      />
    </div>
  );
}