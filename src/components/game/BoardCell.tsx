'use client';

import React from 'react';
import { getCellPosition, getSnakeAt, getLadderAt, getSpecialCellAt, GAME_CONFIG } from '@/lib/game-data';
import { Avatar } from '@/components/avatars/AvatarSVGs';

interface BoardCellProps {
  cell: number;
  players?: Array<{
    id: string;
    avatarId: string;
    displayName: string;
    color: string;
  }>;
  isCurrentPlayer?: boolean;
  className?: string;
}

const SNAKE_HEAD_OFFSET = 8;
const SNAKE_TAIL_OFFSET = 8;
const LADDER_WIDTH = 12;
const LADDER_RUNG_HEIGHT = 6;

export function BoardCell({ cell, players = [], isCurrentPlayer, className }: BoardCellProps) {
  const { row, col } = getCellPosition(cell);
  const snake = getSnakeAt(cell);
  const ladder = getLadderAt(cell);
  const special = getSpecialCellAt(cell);
  const isStart = cell === 1;
  const isFinish = cell === GAME_CONFIG.board.totalCells;

  const cellStyle: React.CSSProperties = {
    gridRow: row + 1,
    gridColumn: col + 1,
  };

  const colors = [
    'bg-[#40C4FF] border-[#00B0FF] text-[#01579B]', // Blue
    'bg-[#FFCA28] border-[#FFB300] text-[#FF6F00]', // Yellow
    'bg-[#69F0AE] border-[#00E676] text-[#1B5E20]', // Green
    'bg-[#FF7043] border-[#F4511E] text-[#BF360C]', // Orange
  ];
  
  // Deterministic color based on cell number
  const colorIndex = (cell * 13) % colors.length;
  const colorTheme = colors[colorIndex];

  const specialClass = special
    ? special.type === 'BONUS'
      ? 'bg-gradient-to-br from-purple-400 to-indigo-500 border-purple-600 text-white shadow-purple-500/30 ring-2 ring-purple-300'
      : special.type === 'GIFT'
      ? 'bg-gradient-to-br from-emerald-400 to-teal-500 border-teal-600 text-white shadow-emerald-500/30 ring-2 ring-emerald-300'
      : 'bg-gradient-to-br from-amber-400 to-orange-500 border-amber-600 text-white shadow-amber-500/30 ring-2 ring-amber-300'
    : '';

  const baseClasses = 'relative flex items-center justify-center text-[11px] font-black transition-colors duration-200 rounded-lg shadow-sm border-b-[3px] border-r-2';
  const stateClasses = isStart
    ? 'bg-[#FFCA28] border-[#FFB300] text-[#FF6F00] ring-2 ring-amber-400'
    : isFinish
    ? 'bg-[#69F0AE] border-[#00E676] text-[#1B5E20] ring-2 ring-emerald-400'
    : special
    ? specialClass
    : colorTheme;

  return (
    <div
      className={`${baseClasses} ${stateClasses} ${className || ''} m-0.5`}
      style={cellStyle}
      data-cell={cell}
    >
      <span className="z-10 opacity-80 bg-white/50 px-1 rounded-md leading-none py-0.5 shadow-sm">{cell}</span>

      {isStart && <span className="absolute -left-1 -bottom-1 text-[9px] font-extrabold bg-amber-200/90 text-amber-900 px-1 rounded shadow-sm z-20">🚩 เริ่ม</span>}
      {isFinish && <span className="absolute -right-1 top-0 text-[9px] font-extrabold bg-emerald-200/90 text-emerald-900 px-1 rounded shadow-sm z-20">🏁 ชัย</span>}
      {special && (
        <span className="absolute -top-1.5 -right-1 text-[9px] px-1 rounded-full bg-white/95 text-indigo-900 font-extrabold shadow-sm z-20 animate-pulse border border-white">
          {special.type === 'BONUS' ? '🎲' : special.type === 'GIFT' ? '🎁' : '⚡'}
        </span>
      )}

      {players.length > 0 && (
        <PlayerStack players={players} isCurrentPlayer={isCurrentPlayer} />
      )}
    </div>
  );
}

interface PlayerStackProps {
  players: Array<{
    id: string;
    avatarId: string;
    displayName: string;
    color: string;
  }>;
  isCurrentPlayer?: boolean;
}

function PlayerStack({ players, isCurrentPlayer }: PlayerStackProps) {
  const maxVisible = 6;
  const visiblePlayers = players.slice(0, maxVisible);
  const remaining = players.length - maxVisible;

  const stackStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 2,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'row-reverse',
    zIndex: 10,
  };

  return (
    <div style={stackStyle} className="pointer-events-none">
      {visiblePlayers.map((player, index) => (
        <PlayerToken
          key={player.id}
          avatarId={player.avatarId}
          color={player.color}
          index={index}
          isCurrent={isCurrentPlayer && index === 0}
        />
      ))}
      {remaining > 0 && (
        <div className="ml-1 w-6 h-6 -ml-1 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs text-gray-600 font-medium">
          +{remaining}
        </div>
      )}
    </div>
  );
}

interface PlayerTokenProps {
  avatarId: string;
  color: string;
  index: number;
  isCurrent?: boolean;
}

function PlayerToken({ avatarId, color, index, isCurrent }: PlayerTokenProps) {
  const offset = index * 16;

  const tokenStyle: React.CSSProperties = {
    marginLeft: index > 0 ? -12 : 0,
    zIndex: 10 - index,
    transform: `translateX(${offset}px)`,
  };

  return (
    <div
      style={tokenStyle}
      className={`relative w-7 h-7 rounded-full border-2 border-white shadow-sm transition-transform duration-200 ${
        isCurrent ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110' : ''
      }`}
      title={avatarId}
    >
      <div className="w-full h-full">
        <Avatar avatarId={avatarId} />
      </div>
      {isCurrent && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white animate-pulse" />
      )}
    </div>
  );
}