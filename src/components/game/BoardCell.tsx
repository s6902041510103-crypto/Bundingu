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

  const baseClasses = 'relative flex items-center justify-center text-xs font-medium border transition-colors duration-200';
  const stateClasses = snake
    ? 'bg-red-100 text-red-800 border-red-200'
    : ladder
    ? 'bg-green-100 text-green-800 border-green-200'
    : special
    ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
    : isStart
    ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
    : isFinish
    ? 'bg-violet-100 text-violet-800 border-violet-200'
    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50';

  return (
    <div
      className={`${baseClasses} ${stateClasses} ${className || ''}`}
      style={cellStyle}
      data-cell={cell}
    >
      <span className="z-10">{cell}</span>

      {isStart && <span className="absolute top-1 left-1 text-indigo-600 text-xs">🚩</span>}
      {isFinish && <span className="absolute top-1 right-1 text-violet-600 text-xs">🏁</span>}
      {snake && <span className="absolute bottom-1 right-1 text-red-600 text-xs">🐍</span>}
      {ladder && <span className="absolute bottom-1 left-1 text-green-600 text-xs">🪜</span>}
      {special && <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-yellow-600 text-xs">✨</span>}

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