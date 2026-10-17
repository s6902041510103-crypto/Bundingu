"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { buildBoardCells, walkPath, FINISH_AT } from "@/lib/board";
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
  const [animatedPositions, setAnimatedPositions] = useState<Record<string, number>>({});
  const [steppingPlayerIds, setSteppingPlayerIds] = useState<Record<string, boolean>>({});
  const lastTargetPositionsRef = useRef<Record<string, number>>({});
  const activeTimersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const timers = activeTimersRef.current;
    return () => {
      Object.values(timers).forEach((t) => window.clearInterval(t));
    };
  }, []);

  useEffect(() => {
    players.forEach((player) => {
      const targetPos = Math.max(1, Math.min(100, player.position || 1));
      const prevTarget = lastTargetPositionsRef.current[player.id];

      // First time seeing this player or reset back to 1
      if (prevTarget === undefined || (targetPos === 1 && prevTarget > 1)) {
        lastTargetPositionsRef.current[player.id] = targetPos;
        setAnimatedPositions((prev) => ({ ...prev, [player.id]: targetPos }));
        return;
      }

      if (targetPos !== prevTarget) {
        lastTargetPositionsRef.current[player.id] = targetPos;

        // Build step-by-step path for this player
        let steps: number[] = [];
        if (
          player.id === movingPlayerId &&
          movementPath &&
          movementPath.length > 0 &&
          movementPath[movementPath.length - 1] === targetPos
        ) {
          steps = movementPath;
        } else if (targetPos > prevTarget && targetPos - prevTarget <= 12) {
          steps = walkPath(prevTarget, targetPos - prevTarget, FINISH_AT);
        } else {
          steps = [targetPos];
        }

        if (activeTimersRef.current[player.id]) {
          window.clearInterval(activeTimersRef.current[player.id]);
        }

        let stepIdx = 0;
        setSteppingPlayerIds((prev) => ({ ...prev, [player.id]: true }));
        setAnimatedPositions((prev) => ({
          ...prev,
          [player.id]: steps[0] ?? targetPos,
        }));

        if (steps.length <= 1) {
          window.setTimeout(() => {
            setSteppingPlayerIds((prev) => ({ ...prev, [player.id]: false }));
          }, 450);
          return;
        }

        const intervalId = window.setInterval(() => {
          stepIdx += 1;
          if (stepIdx >= steps.length) {
            window.clearInterval(intervalId);
            delete activeTimersRef.current[player.id];
            setAnimatedPositions((prev) => ({ ...prev, [player.id]: targetPos }));
            setSteppingPlayerIds((prev) => ({ ...prev, [player.id]: false }));
            return;
          }
          const nextSquare = steps[stepIdx] ?? targetPos;
          setAnimatedPositions((prev) => ({ ...prev, [player.id]: nextSquare }));
        }, 210);

        activeTimersRef.current[player.id] = intervalId;
      }
    });
  }, [players, movingPlayerId, movementPath]);

  // Group players by board square (1..100) using their animated step position
  const playersByCell = useMemo(() => {
    const map = new Map<number, Array<{ id: string; avatarId: string; name: string }>>();
    players.forEach((player) => {
      const rawPos = animatedPositions[player.id] ?? player.position ?? 1;
      const pos = Math.max(1, Math.min(100, rawPos));
      const existing = map.get(pos) || [];
      existing.push({ id: player.id, avatarId: player.avatarId, name: player.name });
      map.set(pos, existing);
    });
    return map;
  }, [players, animatedPositions]);

  const effectiveMovingPlayerId =
    Object.keys(steppingPlayerIds).find((id) => steppingPlayerIds[id]) ?? movingPlayerId;

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
              movingPlayerId={effectiveMovingPlayerId}
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