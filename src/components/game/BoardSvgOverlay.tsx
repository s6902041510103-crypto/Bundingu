'use client';

import React from 'react';
import { SNAKES, LADDERS, getCellPosition, GAME_CONFIG } from '@/lib/game-data';

interface BoardSvgOverlayProps {
  className?: string;
}

export function BoardSvgOverlay({ className }: BoardSvgOverlayProps) {
  const cellSize = 100 / GAME_CONFIG.board.width; // percentage

  const getCellCenter = (cell: number) => {
    const { row, col } = getCellPosition(cell);
    const x = (col + 0.5) * cellSize;
    const y = (row + 0.5) * cellSize;
    return { x, y };
  };

  const snakePaths = SNAKES.map((snake) => {
    const start = getCellCenter(snake.from);
    const end = getCellCenter(snake.to);

    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const cpX = midX + (start.y - end.y) * 0.25;
    const cpY = midY + (end.x - start.x) * 0.25;

    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const arrowSize = 3;
    const arrowX1 = end.x - arrowSize * Math.cos(angle - Math.PI / 6);
    const arrowY1 = end.y - arrowSize * Math.sin(angle - Math.PI / 6);
    const arrowX2 = end.x - arrowSize * Math.cos(angle + Math.PI / 6);
    const arrowY2 = end.y - arrowSize * Math.sin(angle + Math.PI / 6);

    return (
      <g key={`snake-${snake.from}`} className="snake-path">
        <path
          d={`M${start.x},${start.y} Q${cpX},${cpY} ${end.x},${end.y}`}
          stroke="#ef4444"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          className="transition-opacity duration-300 hover:opacity-100"
          style={{ opacity: 0.7, filter: 'drop-shadow(0 1px 2px rgba(239,68,68,0.3))' }}
        />
        <polygon
          points={`${end.x},${end.y} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}`}
          fill="#ef4444"
          className="transition-opacity duration-300 hover:opacity-100"
          style={{ opacity: 0.7 }}
        />
        <circle
          cx={start.x}
          cy={start.y}
          r="4"
          fill="#ef4444"
          className="snake-head pulse-slow"
          style={{ filter: 'drop-shadow(0 1px 2px rgba(239,68,68,0.5))' }}
        />
        <circle
          cx={end.x}
          cy={end.y}
          r="3"
          fill="#fecaca"
          stroke="#ef4444"
          strokeWidth="1.5"
        />
      </g>
    );
  });

  const ladderPaths = LADDERS.map((ladder) => {
    const start = getCellCenter(ladder.from);
    const end = getCellCenter(ladder.to);

    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const perpAngle = angle + Math.PI / 2;
    const rungLength = 14;
    const rungCount = Math.max(3, Math.floor(Math.hypot(end.x - start.x, end.y - start.y) / 12));

    const rungs = Array.from({ length: rungCount }, (_, i) => {
      const t = (i + 1) / (rungCount + 1);
      const cx = start.x + (end.x - start.x) * t;
      const cy = start.y + (end.y - start.y) * t;
      const rx1 = cx + Math.cos(perpAngle) * (rungLength / 2);
      const ry1 = cy + Math.sin(perpAngle) * (rungLength / 2);
      const rx2 = cx - Math.cos(perpAngle) * (rungLength / 2);
      const ry2 = cy - Math.sin(perpAngle) * (rungLength / 2);
      return (
        <line
          key={i}
          x1={rx1}
          y1={ry1}
          x2={rx2}
          y2={ry2}
          stroke="#22c55e"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ opacity: 0.8 }}
        />
      );
    });

    return (
      <g key={`ladder-${ladder.from}`} className="ladder-path">
        <line
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke="#22c55e"
          strokeWidth="3"
          strokeDasharray="8 4"
          strokeLinecap="round"
          style={{ opacity: 0.8 }}
        />
        {rungs}
        <circle
          cx={start.x}
          cy={start.y}
          r="4"
          fill="#22c55e"
          className="ladder-foot"
        />
        <circle
          cx={end.x}
          cy={end.y}
          r="3"
          fill="#bbf7d0"
          stroke="#22c55e"
          strokeWidth="1.5"
        />
      </g>
    );
  });

  return (
    <svg
      className={`w-full h-full ${className || ''}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <defs>
        <filter id="glow-snake" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-ladder" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#glow-snake)">
        {snakePaths}
      </g>
      <g filter="url(#glow-ladder)">
        {ladderPaths}
      </g>
    </svg>
  );
}