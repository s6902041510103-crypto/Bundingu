'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Crown,
  Sparkles,
  Users,
  Play,
  ArrowLeft,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Dice5,
  LayoutGrid,
} from 'lucide-react';
import { GameState, GamePin, PlayerId } from '@/domain/types';
import { ProductionTransport } from '@/lib/transport/ProductionTransport';
import { Avatar } from '@/components/avatars/AvatarSVGs';

interface StudentSession {
  playerId: string;
  displayName: string;
  avatarId: string;
  gamePin: string;
}

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

export default function GameLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const rawPin = params.pin as string;
  const pin = rawPin ? rawPin.toUpperCase() : 'DEMO99';

  const [student, setStudent] = useState<StudentSession | null>(null);
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Transport and Server Realtime state
  const transportRef = useRef<ProductionTransport | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // 1. Read student session from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('student_session');
        if (saved) {
          const parsed = JSON.parse(saved);
          setStudent(parsed);
        }
      } catch (e) {
        console.error('[Lobby] Failed to read student_session:', e);
      }
    }
  }, []);

  // 2. Connect to ProductionTransport & subscribe to Realtime GameState
  useEffect(() => {
    const transport = new ProductionTransport({ type: 'production' });
    transportRef.current = transport;
    setIsConnecting(true);

    transport
      .connect(pin as GamePin, (student?.playerId || undefined) as PlayerId)
      .then(() => {
        setIsConnected(true);
        setIsConnecting(false);
      })
      .catch((err) => {
        console.warn('[Lobby] Transport connect error:', err);
        setConnectionError(err.message || 'Connection failed');
        setIsConnecting(false);
      });

    const unsubscribe = transport.subscribe((state) => {
      setGameState(state);
      setIsConnected(true);
      setIsConnecting(false);
    });

    return () => {
      unsubscribe();
      transport.disconnect().catch(console.error);
      transportRef.current = null;
    };
  }, [pin, student?.playerId]);

  // 3. Auto-transition: When Server GameState changes from 'lobby' to active game phases,
  // automatically redirect to /game/[pin]/play using authoritative state (no guessing).
  useEffect(() => {
    if (!gameState) return;

    const activePhases = [
      'countdown',
      'question',
      'waiting_for_question',
      'rolling',
      'moving',
      'special_event',
      'finished',
    ];

    if (activePhases.includes(gameState.gameStatus)) {
      setIsStarting(true);
      router.push(`/game/${pin}/play`);
    }
  }, [gameState?.gameStatus, pin, router]);

  const handleCopyPin = () => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnterGame = () => {
    setIsStarting(true);
    router.push(`/game/${pin}/play`);
  };

  // Authoritative players from Server GameState
  const roomPlayers = gameState?.players && gameState.players.length > 0
    ? gameState.players
    : student
    ? [
        {
          playerId: student.playerId,
          displayName: student.displayName,
          avatarId: student.avatarId,
          position: 1,
          score: 1,
          status: 'waiting' as const,
          joinOrder: 1,
          bonusMultiplier: 5,
        },
      ]
    : [];

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 font-thai flex flex-col justify-between p-4 sm:p-8">
      {/* Header */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between">
        <Link
          href="/join"
          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          ออกจากห้อง
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold">
            <Crown className="w-4 h-4" />
          </div>
          <span className="font-bold text-gray-800 text-sm">Knowledge Snake</span>
        </div>
      </header>

      {/* Main Lobby Card */}
      <div className="max-w-2xl w-full mx-auto my-8">
        <div className="card p-6 sm:p-10 text-center shadow-xl border-indigo-100 space-y-6">
          {/* Badge & Connection Status */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              ห้องรอเริ่มเกม (Game Lobby)
            </div>

            {isConnected ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Realtime เชื่อมต่อแล้ว
              </div>
            ) : isConnecting ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                กำลังเชื่อมต่อ Realtime...
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                {connectionError || 'ออฟไลน์'}
              </div>
            )}
          </div>

          {/* Game PIN Box */}
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Game PIN ของห้องนี้</p>
            <div className="mt-2 flex items-center justify-center gap-3">
              <span className="font-mono text-5xl sm:text-6xl font-black text-indigo-700 tracking-widest bg-indigo-50/80 px-6 py-2 rounded-2xl border-2 border-indigo-200">
                {pin}
              </span>
              <button
                onClick={handleCopyPin}
                className="p-3 rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-600 shadow-sm transition-colors"
                title="คัดลอก PIN"
              >
                {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Current Student Profile Card */}
          <div className="p-4 rounded-2xl bg-white border-2 border-indigo-200 shadow-sm max-w-sm mx-auto flex items-center gap-4 text-left">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center p-2 shadow-md">
              {student?.avatarId ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Avatar avatarId={student.avatarId} />
                </div>
              ) : (
                <span className="text-2xl">🎒</span>
              )}
            </div>
            <div className="flex-1 truncate">
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">ผู้เล่นของคุณ</span>
              <h3 className="font-bold text-lg text-gray-900 truncate">
                {student?.displayName || 'นักเรียน'}
              </h3>
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> อยู่ในห้องพร้อมเล่น
              </p>
            </div>
          </div>

          {/* Realtime Waiting Status Message */}
          <div className="py-2 text-sm text-gray-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            กำลังรอคุณครูกดเริ่มเกม... เมื่อครูเริ่มเกมจะเข้าสู่กระดานโดยอัตโนมัติ
          </div>

          {/* Realtime Players List */}
          <div>
            <h4 className="text-xs font-bold text-gray-600 mb-3 flex items-center justify-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" />
              เพื่อนร่วมห้อง ({roomPlayers.length} คน)
            </h4>

            {roomPlayers.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-gray-200 text-xs text-gray-400">
                ยังไม่มีผู้เล่นอื่นในห้อง กำลังรอเพื่อนๆ เข้าร่วม...
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1">
                {roomPlayers.map((p, idx) => {
                  const isCurrent = student && p.playerId === student.playerId;
                  const bgColor = PLAYER_COLORS[idx % PLAYER_COLORS.length];
                  return (
                    <div
                      key={p.playerId || idx}
                      className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                        isCurrent
                          ? 'border-indigo-500 bg-indigo-50/70 shadow-sm'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg ${bgColor} text-white flex items-center justify-center p-1 flex-shrink-0 shadow-sm`}>
                        <Avatar avatarId={p.avatarId || 'avatar-01'} />
                      </div>
                      <div className="truncate text-left flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <p className="text-xs font-bold text-gray-800 truncate">
                            {p.displayName}
                          </p>
                          <span
                            className={`text-[9px] font-extrabold px-1 rounded flex-shrink-0 ${
                              ((p as any).bonusMultiplier ?? 1) === 5
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : ((p as any).bonusMultiplier ?? 1) === 4
                                ? 'bg-slate-200 text-slate-800 border border-slate-300'
                                : ((p as any).bonusMultiplier ?? 1) === 3
                                ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                : ((p as any).bonusMultiplier ?? 1) === 2
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            ×{(p as any).bonusMultiplier ?? 1}
                          </span>
                        </div>
                        <span className={`text-[10px] font-semibold ${isCurrent ? 'text-indigo-600' : 'text-emerald-600'}`}>
                          {isCurrent ? '(คุณ) พร้อม' : 'พร้อมเล่น'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleEnterGame}
              disabled={isStarting}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl btn-primary text-base font-bold shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  กำลังเข้าสู่เกม...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  เข้าสู่หน้ากระดานเกม (Enter Game)
                </>
              )}
            </button>

            <Link
              href={`/game/${pin}/projector`}
              target="_blank"
              className="w-full sm:w-auto px-4 py-3.5 rounded-xl btn-secondary text-sm font-semibold flex items-center justify-center gap-1.5"
            >
              <LayoutGrid className="w-4 h-4 text-indigo-600" />
              เปิดมุมมองโปรเจกเตอร์
            </Link>

            <Link
              href="/game/board"
              target="_blank"
              className="w-full sm:w-auto px-4 py-3.5 rounded-xl btn-secondary text-sm font-semibold flex items-center justify-center gap-1.5"
            >
              <LayoutGrid className="w-4 h-4 text-gray-500" />
              แผนผัง 100 ช่อง
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-400">
        Knowledge Snake • Game PIN: {pin}
      </footer>
    </main>
  );
}
