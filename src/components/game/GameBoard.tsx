'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BoardCell } from './BoardCell';
import { BoardSvgOverlay } from './BoardSvgOverlay';
import { Dice, DiceTray } from './Dice';
import { GAME_CONFIG, SNAKES, LADDERS, calculateFinalPosition, isFinishCell, getCellPosition } from '@/lib/game-data';
import { Avatar } from '@/components/avatars/AvatarSVGs';

export interface Player {
  playerId: string;
  displayName: string;
  avatarId: string;
  position: number;
  score: number;
  color: string;
}

export interface GameBoardProps {
  players?: Player[];
  currentPlayerId?: string;
  diceValue?: 1 | 2 | 3 | 4 | 5 | 6;
  isRolling?: boolean;
  diceAnimationSeed?: string;
  round?: number;
  gameStatus?: 'lobby' | 'question' | 'rolling' | 'moving' | 'finished';
  mode?: 'play' | 'preview';
  onRollDice?: () => void;
  onPlayerClick?: (playerId: string) => void;
  className?: string;
}

const PLAYER_COLORS = [
  'bg-indigo-500',
  'bg-red-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-pink-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-emerald-500',
];

export function GameBoard({
  players = [],
  currentPlayerId,
  diceValue = 1,
  isRolling = false,
  diceAnimationSeed,
  round = 1,
  gameStatus = 'lobby',
  mode = 'play',
  onRollDice,
  onPlayerClick,
  className = '',
}: GameBoardProps) {
  const [animatingPlayer, setAnimatingPlayer] = useState<string | null>(null);
  const [animationPath, setAnimationPath] = useState<number[]>([]);

  // Group players by position
  const playersByPosition = useMemo(() => {
    const map = new Map<number, Player[]>();
    players.forEach((player) => {
      if (!map.has(player.position)) {
        map.set(player.position, []);
      }
      map.get(player.position)!.push(player);
    });
    return map;
  }, [players]);

  // Get cell players for rendering
  const getCellPlayers = useCallback((cell: number) => {
    const cellPlayers = playersByPosition.get(cell) || [];
    return cellPlayers
      .filter((p) => p.playerId !== animatingPlayer)
      .map((p, index) => ({
        id: p.playerId,
        avatarId: p.avatarId,
        displayName: p.displayName,
        color: PLAYER_COLORS[index % PLAYER_COLORS.length],
      }));
  }, [playersByPosition, animatingPlayer]);

  const currentPlayer = players.find(p => p.playerId === currentPlayerId);
  const isCurrentPlayerTurn = currentPlayerId && gameStatus === 'rolling';

  const handleRollClick = useCallback(() => {
    if (onRollDice && !isRolling && isCurrentPlayerTurn) {
      onRollDice();
    }
  }, [onRollDice, isRolling, isCurrentPlayerTurn]);

  // Trigger movement animation when dice result changes
  useEffect(() => {
    if (currentPlayerId && diceValue && !isRolling && gameStatus === 'moving') {
      const player = players.find(p => p.playerId === currentPlayerId);
      if (player) {
        const { path } = calculateFinalPosition(player.position, diceValue);
        setAnimatingPlayer(currentPlayerId);
        setAnimationPath(path);

        // Clear animation after duration
        const duration = Math.min(path.length * 400, 2500);
        setTimeout(() => {
          setAnimatingPlayer(null);
          setAnimationPath([]);
        }, duration);
      }
    }
  }, [diceValue, isRolling, gameStatus, currentPlayerId, players]);

  return (
    <div className={`relative ${className} ${mode === 'play' ? 'w-full h-full' : ''}`}>
      {/* Board Container */}
      <div className={`relative aspect-square rounded-xl p-1 shadow-inner h-full w-full ${mode === 'preview' ? 'bg-gray-100' : ''}`}>
        {/* Grid Background */}
        <div className={`grid grid-cols-10 gap-0.5 rounded-lg h-full w-full ${mode === 'preview' ? 'bg-gray-200' : ''}`}>
          {Array.from({ length: 100 }, (_, i) => i + 1).map((cell) => (
            <BoardCell
              key={cell}
              cell={cell}
              players={getCellPlayers(cell)}
              isCurrentPlayer={!!animatingPlayer && getCellPlayers(cell).some((p) => p.id === animatingPlayer)}
            />
          ))}
        </div>

        {/* SVG Overlay for Snakes & Ladders */}
        <BoardSvgOverlay />

        {/* Animated Pawn */}
        <AnimatePresence>
          {animatingPlayer && animationPath.length > 1 && (
            <AnimatedPawn
              key={animatingPlayer}
              player={players.find(p => p.playerId === animatingPlayer)!}
              path={animationPath}
            />
          )}
        </AnimatePresence>

        {/* Movement Animation Path */}
        {animatingPlayer && animationPath.length > 1 && (
          <MovementPath
            path={animationPath}
            color={players.find(p => p.playerId === animatingPlayer)?.color || PLAYER_COLORS[0]}
          />
        )}
      </div>

      {/* Game Info Sidebar */}
      {mode === 'preview' && (
        <div className="mt-4 lg:mt-0 lg:ml-6 flex-1 max-w-xs">
          <GameInfo
            round={round}
            gameStatus={gameStatus}
            currentPlayer={currentPlayer}
            diceValue={diceValue}
            isRolling={isRolling}
            players={players}
            mode={mode}
            onRollDice={handleRollClick}
            onPlayerClick={onPlayerClick}
          />
        </div>
      )}
    </div>
  );
}

interface AnimatedPawnProps {
  player: Player;
  path: number[];
}

function AnimatedPawn({ player, path }: AnimatedPawnProps) {
  const keyframesX = path.map(cell => {
    const { col } = getCellPosition(cell);
    return `${col * 10 + 5}%`;
  });
  
  const keyframesY = path.map(cell => {
    const { row } = getCellPosition(cell);
    return `${row * 10 + 5}%`;
  });

  const duration = Math.min(path.length * 0.4, 2.5);

  return (
    <motion.div
      className={`absolute z-50 w-7 h-7 -ml-[14px] -mt-[14px] rounded-full border-2 border-white shadow-xl ${player.playerId === player.playerId ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
      initial={{ left: keyframesX[0], top: keyframesY[0], scale: 1 }}
      animate={{
        left: keyframesX,
        top: keyframesY,
        scale: [1, 1.3, 1],
      }}
      transition={{
        duration,
        ease: "easeInOut",
        times: path.length > 1 ? path.map((_, i) => i / (path.length - 1)) : undefined
      }}
    >
      <div className="w-full h-full">
        <Avatar avatarId={player.avatarId} />
      </div>
      <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white animate-pulse" />
    </motion.div>
  );
}

interface MovementPathProps {
  path: number[];
  color: string;
}

function MovementPath({ path, color }: MovementPathProps) {
  const points = path.map((cell, index) => {
    const { row, col } = getCellPosition(cell);
    const x = (col + 0.5) * 10;
    const y = (row + 0.5) * 10;
    return { x, y, index };
  });

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  return (
    <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path
        d={pathData}
        stroke={color}
        strokeWidth="4"
        fill="none"
        strokeDasharray="8 4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-draw"
        style={{
          strokeDashoffset: 0,
          animation: 'drawPath 1s ease-out forwards',
        }}
      />
      <defs>
        <style>{`
          @keyframes drawPath {
            from { stroke-dashoffset: 1000; opacity: 0; }
            to { stroke-dashoffset: 0; opacity: 1; }
          }
        `}</style>
      </defs>
    </svg>
  );
}

interface GameInfoProps {
  round: number;
  gameStatus: 'lobby' | 'question' | 'rolling' | 'moving' | 'finished';
  currentPlayer?: Player;
  diceValue: 1 | 2 | 3 | 4 | 5 | 6;
  isRolling: boolean;
  players: Player[];
  mode: 'play' | 'preview';
  onRollDice: () => void;
  onPlayerClick?: (playerId: string) => void;
}

function GameInfo({ round, gameStatus, currentPlayer, diceValue, isRolling, players, mode, onRollDice, onPlayerClick }: GameInfoProps) {
  const statusLabels = {
    lobby: 'รอเริ่มเกม',
    question: 'ตอบคำถาม',
    rolling: 'ทอยลูกเต๋า',
    moving: 'กำลังเดิน',
    finished: 'จบเกม',
  };

  const statusColors = {
    lobby: 'bg-gray-100 text-gray-700',
    question: 'bg-blue-100 text-blue-700',
    rolling: 'bg-indigo-100 text-indigo-700',
    moving: 'bg-orange-100 text-orange-700',
    finished: 'bg-green-100 text-green-700',
  };

  if (mode === 'preview') {
    return (
      <div className="card p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Podium Preview</h3>
        <div className="space-y-3">
          {players.slice(0, 3).map((player, index) => (
            <div key={player.playerId} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{player.displayName}</p>
                <p className="text-xs text-gray-500">ช่องที่ {player.position} • คะแนน {player.score}</p>
              </div>
            </div>
          ))}
          {players.length === 0 && (
            <p className="text-center text-gray-500 py-4">ยังไม่มีผู้เล่น</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Round & Status */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">รอบที่ {round} / 10</h3>
          <span className={`badge ${statusColors[gameStatus]}`}>{statusLabels[gameStatus]}</span>
        </div>

        {/* Current Player Turn */}
        {currentPlayer && gameStatus === 'rolling' && (
          <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200 animate-pulse">
            <p className="text-sm text-indigo-700">ถึงตา</p>
            <p className="font-medium text-indigo-900">{currentPlayer.displayName}</p>
          </div>
        )}

        {/* Dice Tray */}
        <DiceTray
          value={diceValue}
          isRolling={isRolling}
          animationSeed=""
          onRoll={onRollDice}
          disabled={!currentPlayer || gameStatus !== 'rolling'}
        />
      </div>

      {/* Player List / Leaderboard */}
      <div className="card p-4">
        <h4 className="font-medium text-gray-900 mb-3">ผู้เล่น ({players.length}/40)</h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {players
            .slice()
            .sort((a, b) => b.score - a.score)
            .map((player, index) => (
              <div
                key={player.playerId}
                className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                  player.playerId === currentPlayer?.playerId ? 'bg-indigo-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => onPlayerClick?.(player.playerId)}
              >
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                  {index + 1}
                </span>
                <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[11px]"
                     style={{ backgroundImage: `url(/avatars/${player.avatarId}.svg)` }}>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{player.displayName}</p>
                  <p className="text-xs text-gray-500">ช่อง {player.position} • {player.score} คะแนน</p>
                </div>
                {player.playerId === currentPlayer?.playerId && (
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}