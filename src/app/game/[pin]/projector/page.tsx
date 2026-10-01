'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Crown,
  Sparkles,
  Users,
  Clock,
  Trophy,
  Dice5,
  CheckCircle2,
  HelpCircle,
  LayoutGrid,
} from 'lucide-react';
import { GameState, GamePin, GameEvent } from '@/domain/types';
import { ProductionTransport } from '@/lib/transport/ProductionTransport';
import { GameBoard, Player } from '@/components/game/GameBoard';
import { Avatar } from '@/components/avatars/AvatarSVGs';
import { Dice } from '@/components/game/Dice';

const PLAYER_COLORS = [
  'bg-indigo-500',
  'bg-red-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-pink-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-lime-500',
];

export default function ProjectorViewPage() {
  const params = useParams();
  const rawPin = params.pin as string;
  const pin = rawPin ? rawPin.toUpperCase() : 'DEMO99';

  // Authoritative State from ProductionTransport (Read-Only)
  const transportRef = useRef<ProductionTransport | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Projector Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Local Timers synced to server phaseEndsAt
  const [countdownRemaining, setCountdownRemaining] = useState<number>(3);
  const [questionTimeRemaining, setQuestionTimeRemaining] = useState<number>(15);
  const [diceDisplayValue, setDiceDisplayValue] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [isDiceRolling, setIsDiceRolling] = useState(false);
  const [eventNotification, setEventNotification] = useState<string | null>(null);

  // 1. Connect to ProductionTransport as Read-Only Classroom Projector Client
  useEffect(() => {
    const transport = new ProductionTransport({ type: 'production' });
    transportRef.current = transport;

    transport
      .connect(pin as GamePin)
      .then(() => setIsConnected(true))
      .catch((err) => console.warn('[Projector] Transport connect error:', err));

    const unsubscribeState = transport.subscribe((state) => {
      setGameState(state);
      setIsConnected(true);
      if (state.dice?.value) {
        setDiceDisplayValue(state.dice.value as any);
      }
    });

    const unsubscribeEvents = transport.subscribeToEvents((event: GameEvent) => {
      if (event.type === 'DICE_ROLLED') {
        setIsDiceRolling(true);
        if (event.dice?.value) {
          setDiceDisplayValue(event.dice.value as any);
        }
        setTimeout(() => setIsDiceRolling(false), 800);
      } else if (event.type === 'PLAYER_MOVED') {
        setEventNotification(`ผู้เล่นเดินไปที่ช่อง ${event.finalPosition}`);
        setTimeout(() => setEventNotification(null), 3000);
      } else if (event.type === 'GAME_FINISHED') {
        setEventNotification('🎉 จบเกมแล้ว! ประกาศผลผู้ชนะ');
      }
    });

    return () => {
      unsubscribeState();
      unsubscribeEvents();
      transport.disconnect().catch(console.error);
      transportRef.current = null;
    };
  }, [pin]);

  // 2. Countdown ticker (3 -> 2 -> 1)
  useEffect(() => {
    if (!gameState || gameState.gameStatus !== 'countdown') {
      return;
    }

    const interval = setInterval(() => {
      if (gameState.phaseEndsAt) {
        const msLeft = new Date(gameState.phaseEndsAt).getTime() - Date.now();
        const sec = Math.max(1, Math.ceil(msLeft / 1000));
        setCountdownRemaining(sec);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [gameState]);

  // 3. Question timer ticker (15s)
  useEffect(() => {
    if (!gameState || gameState.gameStatus !== 'question') {
      return;
    }

    const interval = setInterval(() => {
      if (gameState.phaseEndsAt) {
        const msLeft = new Date(gameState.phaseEndsAt).getTime() - Date.now();
        const sec = Math.max(0, Math.ceil(msLeft / 1000));
        setQuestionTimeRemaining(sec);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [gameState]);

  // 4. Toggle browser fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(console.error);
        setIsFullscreen(false);
      }
    }
  };

  // Convert gameState.players to GameBoard format
  const boardPlayers: Player[] = useMemo(() => {
    if (!gameState?.players || gameState.players.length === 0) {
      return [];
    }
    return gameState.players.map((p, idx) => ({
      playerId: p.playerId,
      displayName: p.displayName,
      avatarId: p.avatarId || 'avatar-01',
      position: p.position || 1,
      score: p.score || 1,
      color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
    }));
  }, [gameState?.players]);

  // Sorted leaderboard by score and position
  const leaderboardPlayers = useMemo(() => {
    return [...boardPlayers].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.position - a.position;
    });
  }, [boardPlayers]);

  // Current active player who is rolling
  const currentRollingPlayer = useMemo(() => {
    if (!gameState?.currentPlayerId) return null;
    return boardPlayers.find((p) => p.playerId === gameState.currentPlayerId) || null;
  }, [boardPlayers, gameState?.currentPlayerId]);

  // Current question data (strictly PublicQuestion, no correctAnswer)
  const currentQuestion = gameState?.currentQuestion;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-thai flex flex-col select-none overflow-x-hidden">
      {/* Top Projector Header Bar */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between flex-shrink-0 z-20 shadow-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-wide flex items-center gap-2 text-white">
                Knowledge Snake
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-900/80 text-indigo-300 border border-indigo-700/50">
                  Projector View
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">จอแสดงผลหลักประจำห้องเรียน</p>
            </div>
          </div>
        </div>

        {/* Center: Prominent Game PIN & Join URL */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-slate-800/90 px-4 py-1.5 rounded-2xl border border-slate-700 shadow-inner">
            <span className="text-xs text-slate-400 font-medium">เข้าร่วมที่: <b className="text-indigo-400 font-mono">/join</b></span>
            <span className="text-xs text-slate-500">•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">PIN:</span>
              <span className="font-mono text-xl font-black text-amber-400 tracking-widest">
                {pin}
              </span>
            </div>
          </div>

          {/* Phase Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {gameState?.gameStatus === 'lobby' && 'สถานะ: รอเริ่มเกม (Lobby)'}
            {gameState?.gameStatus === 'countdown' && 'สถานะ: เตรียมนับถอยหลัง'}
            {gameState?.gameStatus === 'question' && `คำถามข้อที่ ${gameState.currentRound || 1}`}
            {gameState?.gameStatus === 'rolling' && 'สถานะ: รอบทอยลูกเต๋า'}
            {gameState?.gameStatus === 'moving' && 'สถานะ: เดินหมาก'}
            {gameState?.gameStatus === 'finished' && 'สถานะ: จบเกม'}
            {!gameState?.gameStatus && 'กำลังโหลดข้อมูลห้อง...'}
          </div>
        </div>

        {/* Right: Round & Fullscreen Controls */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-slate-400">รอบที่</span>
            <p className="font-mono font-bold text-indigo-400 text-sm">
              {gameState?.currentRound || 1} / {gameState?.totalRounds || 10}
            </p>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
            title={isFullscreen ? 'ออกจากเต็มจอ' : 'แสดงผลเต็มหน้าจอ'}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isFullscreen ? 'ย่อจอ' : 'เต็มจอ'}</span>
          </button>
        </div>
      </header>

      {/* Event Notification Toast Banner */}
      {eventNotification && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-center py-1.5 px-4 font-bold text-sm shadow-md animate-in">
          {eventNotification}
        </div>
      )}

      {/* Main Content: 100-cell Board (Left/Center) + Info & Leaderboard (Right) */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 lg:p-6 overflow-hidden">
        {/* Left Column (8 cols): Interactive Dynamic 100-Cell Game Board */}
        <div className="lg:col-span-8 flex flex-col justify-center items-center relative">
          <div className="w-full max-w-[850px] aspect-square bg-slate-900/80 rounded-3xl p-3 sm:p-5 border border-slate-800 shadow-2xl relative flex items-center justify-center">
            {/* The 100-Cell Board Component */}
            <GameBoard
              players={boardPlayers}
              currentPlayerId={gameState?.currentPlayerId}
              diceValue={diceDisplayValue}
              isRolling={isDiceRolling}
              round={gameState?.currentRound || 1}
              gameStatus={gameState?.gameStatus as any || 'lobby'}
              mode="play"
              className="w-full h-full"
            />

            {/* OVERLAY 1: Countdown 3 -> 2 -> 1 */}
            {gameState?.gameStatus === 'countdown' && (
              <div className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center text-center animate-in">
                <div className="w-20 h-20 rounded-full bg-indigo-500/20 border-2 border-indigo-400 flex items-center justify-center mb-4">
                  <Clock className="w-10 h-10 text-indigo-400 animate-spin" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-200 mb-2">
                  เตรียมตัวตอบคำถามข้อถัดไป
                </h3>
                <div className="font-mono text-8xl sm:text-9xl font-black text-amber-400 tracking-wider animate-pulse drop-shadow-[0_10px_35px_rgba(251,191,36,0.4)]">
                  {countdownRemaining}
                </div>
                <p className="text-sm text-slate-400 mt-4">
                  อ่านคำถามบนหน้าจอ แล้วกดคำตอบบนโทรศัพท์ของคุณ
                </p>
              </div>
            )}

            {/* OVERLAY 2: Question Active Banner (High Visibility for Classroom) */}
            {gameState?.gameStatus === 'question' && currentQuestion && (
              <div className="absolute top-4 left-4 right-4 z-20 bg-slate-900/95 border-2 border-indigo-500/80 rounded-2xl p-5 shadow-2xl backdrop-blur-md animate-in">
                <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-indigo-600 text-white text-xs font-bold">
                      ข้อที่ {gameState.currentRound || 1}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      หมวด: {currentQuestion.category || 'ทั่วไป'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span className="font-mono text-lg font-black text-amber-400">
                      {questionTimeRemaining}s
                    </span>
                  </div>
                </div>

                {/* Big Question Text */}
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 leading-snug">
                  {currentQuestion.question}
                </h2>

                {/* Choices (4 Options Read-Only, strictly no answer leaked) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentQuestion.choices.map((choice, cIdx) => {
                    const letters = ['A', 'B', 'C', 'D'];
                    const optionColors = [
                      'bg-red-500/10 border-red-500/40 text-red-300',
                      'bg-blue-500/10 border-blue-500/40 text-blue-300',
                      'bg-amber-500/10 border-amber-500/40 text-amber-300',
                      'bg-emerald-500/10 border-emerald-500/40 text-emerald-300',
                    ];
                    return (
                      <div
                        key={cIdx}
                        className={`p-3 rounded-xl border flex items-center gap-3 ${optionColors[cIdx]}`}
                      >
                        <span className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 font-bold flex items-center justify-center text-sm text-white flex-shrink-0">
                          {letters[cIdx]}
                        </span>
                        <span className="font-semibold text-sm text-slate-100 truncate">
                          {choice}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* 15s Progress Bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full mt-4 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 transition-all duration-500"
                    style={{ width: `${(questionTimeRemaining / 15) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Dice Action, Roll Queue & Live Leaderboard */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Active Player / Dice Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Dice5 className="w-4 h-4 text-indigo-400" />
              การทอยลูกเต๋า (Dice Turn)
            </h3>

            {gameState?.gameStatus === 'rolling' && currentRollingPlayer ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-950/60 border border-indigo-800/60">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600 p-1 flex items-center justify-center shadow-md">
                    <Avatar avatarId={currentRollingPlayer.avatarId} />
                  </div>
                  <div>
                    <span className="text-[11px] text-indigo-300 font-semibold">ถึงตาของ:</span>
                    <h4 className="font-bold text-base text-white truncate max-w-[140px]">
                      {currentRollingPlayer.displayName}
                    </h4>
                    <p className="text-xs text-amber-400">กำลังทอยลูกเต๋า...</p>
                  </div>
                </div>

                {/* Big Animated 3D Dice */}
                <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                  <Dice
                    value={diceDisplayValue}
                    isRolling={isDiceRolling}
                    size="md"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-center text-xs text-slate-400 flex items-center justify-center gap-3">
                <Dice
                  value={diceDisplayValue}
                  isRolling={false}
                  size="sm"
                />
                <span>แต้มล่าสุด: <b className="text-white text-sm">{diceDisplayValue}</b></span>
              </div>
            )}
          </div>

          {/* Live Classroom Leaderboard */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex-1 flex flex-col min-h-[380px]">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                อันดับคะแนน (Leaderboard)
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                ผู้เล่น {leaderboardPlayers.length} คน
              </span>
            </div>

            {leaderboardPlayers.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-xs text-slate-500">
                <Users className="w-8 h-8 text-slate-700 mb-2" />
                กำลังรอผู้เล่นเข้าร่วมห้อง...
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {leaderboardPlayers.map((player, rank) => {
                  const isTop1 = rank === 0;
                  const isTop2 = rank === 1;
                  const isTop3 = rank === 2;

                  return (
                    <div
                      key={player.playerId}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                        isTop1
                          ? 'bg-amber-950/40 border-amber-500/60 shadow-md'
                          : isTop2
                          ? 'bg-slate-800/80 border-slate-600'
                          : isTop3
                          ? 'bg-amber-900/20 border-amber-700/40'
                          : 'bg-slate-800/40 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                            isTop1
                              ? 'bg-amber-400 text-amber-950'
                              : isTop2
                              ? 'bg-slate-300 text-slate-900'
                              : isTop3
                              ? 'bg-amber-700 text-white'
                              : 'text-slate-500'
                          }`}
                        >
                          {rank + 1}
                        </span>

                        <div className="w-8 h-8 rounded-lg bg-slate-800 p-0.5 border border-slate-700 flex-shrink-0">
                          <Avatar avatarId={player.avatarId} />
                        </div>

                        <div className="truncate">
                          <p className="font-bold text-xs text-slate-100 truncate max-w-[120px]">
                            {player.displayName}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            ช่องที่ {player.position} / 100
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-amber-400 text-sm">
                          {player.score}
                        </span>
                        <span className="text-[10px] text-slate-500 block">คะแนน</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
