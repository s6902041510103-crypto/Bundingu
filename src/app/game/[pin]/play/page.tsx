'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GameBoard, GamePodiumModal } from '@/components/game';
import { Avatar } from '@/components/avatars/AvatarSVGs';
import {
  LogOut,
  Crown,
  CheckCircle2,
  Sparkles,
  Play,
  Clock,
  User,
  HelpCircle,
  Users,
  Trophy,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { ChoiceIndex, GameState, GamePin, PlayerId } from '@/domain/types';
import { ProductionTransport } from '@/lib/transport/ProductionTransport';

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

function DiceFace({ value }: { value: number }) {
  const dots: number[][] = [
    [],
    [5],
    [1, 9],
    [1, 5, 9],
    [1, 3, 7, 9],
    [1, 3, 5, 7, 9],
    [1, 2, 3, 7, 8, 9],
  ];
  return (
    <div className="w-16 h-16 bg-white rounded-2xl shadow-[0_4px_0_0_#e2e8f0] border border-gray-100 grid grid-cols-3 grid-rows-3 p-2 gap-1">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="flex items-center justify-center">
          {dots[value]?.includes(i + 1) && <div className="w-2.5 h-2.5 bg-slate-800 rounded-full" />}
        </div>
      ))}
    </div>
  );
}

export default function GamePlayPage() {
  const params = useParams();
  const router = useRouter();
  const rawPin = params.pin as string;
  const pin = rawPin ? rawPin.toUpperCase() : '4827';

  // Role toggle: allow user to easily switch between Teacher and Student view for complete testing
  const [role, setRole] = useState<'teacher' | 'student'>('teacher');
  const isTeacher = role === 'teacher';

  // Active student identity
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [myDisplayName, setMyDisplayName] = useState<string>('');
  const [myAvatarId, setMyAvatarId] = useState<string>('avatar-01');

  // Transport and Server GameState
  const transportRef = useRef<ProductionTransport | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

  // Client UI state
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState<boolean>(false);
  const [isRolling, setIsRolling] = useState(false);
  const [diceDisplayValue, setDiceDisplayValue] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [countdownRemaining, setCountdownRemaining] = useState<number>(3);
  const [questionTimeRemaining, setQuestionTimeRemaining] = useState<number>(15);
  const [showPodium, setShowPodium] = useState<boolean>(false);

  // Load student session from localStorage if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('student_session');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.playerId) {
            setMyPlayerId(parsed.playerId);
            setMyDisplayName(parsed.displayName || 'นักเรียน');
            if (parsed.avatarId) {
              setMyAvatarId(parsed.avatarId);
            }
            setRole('student');
          }
        }
      } catch (e) {
        console.error('Failed to parse student_session:', e);
      }
    }
  }, []);

  // Initialize and connect ProductionTransport
  useEffect(() => {
    const transport = new ProductionTransport({ type: 'production' });
    transportRef.current = transport;

    transport.connect(pin as GamePin, myPlayerId as PlayerId).catch(console.error);

    const unsubscribe = transport.subscribe((state) => {
      setGameState(state);
      if (state.dice?.value) {
        setDiceDisplayValue(state.dice.value as any);
      }
      if (state.gameStatus === 'finished') {
        setShowPodium(true);
      }
    });

    return () => {
      unsubscribe();
      transport.disconnect().catch(console.error);
      transportRef.current = null;
    };
  }, [pin, myPlayerId]);

  // Handle countdown (3 -> 2 -> 1) ticker
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

  // Handle 15s question timer ticker
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

  // Reset selected answer when a new round or countdown starts
  useEffect(() => {
    if (gameState?.gameStatus === 'countdown' || gameState?.gameStatus === 'waiting_for_question') {
      setSelectedAnswer(null);
      setIsSubmittingAnswer(false);
    }
  }, [gameState?.currentRound, gameState?.gameStatus]);

  // Prepared player list for board & leaderboard
  const displayPlayers = useMemo(() => {
    if (gameState?.players && gameState.players.length > 0) {
      return gameState.players.map((p, idx) => ({
        playerId: p.playerId,
        displayName: p.displayName,
        avatarId: p.avatarId || 'avatar-01',
        position: p.position || 1,
        score: p.finalScore ?? p.score ?? 1,
        color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
        status: p.status,
      }));
    }

    if (myPlayerId && myDisplayName) {
      return [
        {
          playerId: myPlayerId,
          displayName: myDisplayName,
          avatarId: myAvatarId || 'avatar-01',
          position: 1,
          score: 1,
          color: PLAYER_COLORS[0],
          status: 'waiting' as const,
        },
      ];
    }

    // Fallback for demo preview
    return [
      { playerId: 'p1', displayName: 'น้องนัท', avatarId: 'avatar-09', position: 1, score: 5, color: PLAYER_COLORS[0], status: 'waiting' as const },
      { playerId: 'p2', displayName: 'น้องมายด์', avatarId: 'avatar-05', position: 1, score: 4, color: PLAYER_COLORS[1], status: 'waiting' as const },
      { playerId: 'p3', displayName: 'น้องอาร์ม', avatarId: 'avatar-02', position: 1, score: 3, color: PLAYER_COLORS[2], status: 'waiting' as const },
      { playerId: 'p4', displayName: 'น้องจูน', avatarId: 'avatar-04', position: 1, score: 2, color: PLAYER_COLORS[3], status: 'waiting' as const },
    ];
  }, [gameState, myPlayerId, myDisplayName, myAvatarId]);

  // Current active viewer player object
  const myPlayer = useMemo(() => {
    return displayPlayers.find((p) => p.playerId === myPlayerId) || displayPlayers[0];
  }, [displayPlayers, myPlayerId]);

  // Current active question
  const currentQuestion = gameState?.currentQuestion;

  // Requirement 1 & 6: Submit Answer
  const handleSelectAnswer = async (choiceIndex: number) => {
    if (isSubmittingAnswer || !gameState || gameState.gameStatus !== 'question') {
      return;
    }
    if (myPlayer?.status === 'answered') {
      return;
    }

    setSelectedAnswer(choiceIndex);
    setIsSubmittingAnswer(true);

    try {
      if (transportRef.current) {
        await transportRef.current.sendCommand({
          type: 'SUBMIT_ANSWER',
          gamePin: pin as GamePin,
          playerId: myPlayerId as PlayerId,
          questionId: (currentQuestion as any)?.questionId || 'q1',
          choiceIndex: choiceIndex as ChoiceIndex,
          clientTimestamp: Date.now(),
        });
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  // Requirement 2: Teacher Starts Question
  const handleTeacherStartQuestion = async () => {
    if (!transportRef.current || gameState?.gameStatus === 'special_event') {
      return;
    }
    try {
      await transportRef.current.sendCommand({
        type: 'START_QUESTION',
        gamePin: pin as GamePin,
        teacherId: 'teacher-1' as any,
      });
    } catch (err) {
      console.error('Error starting question:', err);
    }
  };

  // Requirement 4 & 5: Teacher Advances Question early if all players answered
  const handleTeacherAdvanceQuestion = async () => {
    if (!transportRef.current || !gameState || gameState.gameStatus !== 'question') {
      return;
    }
    if (!gameState.allPlayersAnswered && questionTimeRemaining > 0) {
      return;
    }
    try {
      await transportRef.current.sendCommand({
        type: 'ADVANCE_QUESTION',
        gamePin: pin as GamePin,
        teacherId: 'teacher-1' as any,
      });
    } catch (err) {
      console.error('Error advancing question:', err);
    }
  };

  // Requirement 6: Dice Roll
  const handleRollDice = async () => {
    if (isRolling || !gameState || gameState.gameStatus !== 'rolling') {
      return;
    }
    if (gameState.currentPlayerId && gameState.currentPlayerId !== myPlayerId) {
      return;
    }

    setIsRolling(true);

    // Visual roll animation
    let rollCount = 0;
    const interval = setInterval(() => {
      setDiceDisplayValue((Math.floor(Math.random() * 6) + 1) as any);
      rollCount++;
      if (rollCount > 8) {
        clearInterval(interval);
        setIsRolling(false);
        if (transportRef.current) {
          transportRef.current.sendCommand({
            type: 'ROLL_DICE',
            gamePin: pin as GamePin,
            playerId: myPlayerId as PlayerId,
          }).catch(console.error);
        }
      }
    }, 80);
  };

  // Requirement 8, 10, 11: Complete Special Event
  const handleCompleteSpecialEvent = async () => {
    if (!transportRef.current || !gameState?.specialEvent) {
      return;
    }
    try {
      await transportRef.current.sendCommand({
        type: 'COMPLETE_SPECIAL_EVENT',
        gamePin: pin as GamePin,
        playerId: (gameState.specialEvent.playerId || myPlayerId) as PlayerId,
      });
    } catch (err) {
      console.error('Error completing special event:', err);
    }
  };

  const isCurrentRoller = gameState?.gameStatus === 'rolling' && gameState?.currentPlayerId === myPlayerId;
  const currentRollerName = displayPlayers.find((p) => p.playerId === gameState?.currentPlayerId)?.displayName || 'เพื่อนร่วมชั้น';
  const specialEvent = gameState?.specialEvent;
  const specialPlayerName = displayPlayers.find((p) => p.playerId === specialEvent?.playerId)?.displayName || 'ผู้เล่น';
  const isMySpecialEvent = specialEvent?.playerId === myPlayerId;

  return (
    <main className="min-h-screen bg-[#0C1F26] bg-[url('https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?q=80&w=2074&auto=format&fit=crop')] bg-cover bg-center bg-fixed font-thai flex flex-col relative overflow-hidden text-white">
      {/* Semi-transparent dark overlay */}
      <div className="absolute inset-0 bg-[#07161B]/70 backdrop-blur-sm z-0" />

      {/* Requirement 3: Centered 3 -> 2 -> 1 Countdown Overlay */}
      {gameState?.gameStatus === 'countdown' && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#122A36]/90 border border-white/20 p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center max-w-sm mx-4">
            <span className="text-amber-400 font-extrabold text-sm uppercase tracking-widest mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 animate-spin" /> เตรียมพร้อมสำหรับคำถาม
            </span>
            <div className="text-8xl sm:text-9xl font-black text-white my-4 animate-bounce drop-shadow-[0_0_40px_rgba(250,204,21,0.8)]">
              {countdownRemaining}
            </div>
            <p className="text-gray-300 font-bold text-sm">
              คำถามข้อที่ {(gameState.currentRound || 0)}/{gameState.totalRounds || 10}
            </p>
          </div>
        </div>
      )}

      {/* Requirement 7, 8, 10, 11: Special Event Modal Overlay */}
      {gameState?.gameStatus === 'special_event' && specialEvent && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200 p-4">
          <div className="bg-[#122A36] border-2 border-amber-400/80 p-8 rounded-3xl shadow-[0_0_60px_rgba(251,191,36,0.3)] flex flex-col items-center text-center max-w-md w-full">
            <div className="w-20 h-20 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-4xl mb-4 shadow-lg">
              {specialEvent.cell === 25 ? '🎲' : specialEvent.cell === 50 ? '🎁' : '⚡'}
            </div>
            <span className="text-xs uppercase font-black tracking-widest bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full border border-amber-400/30 mb-2">
              SPECIAL EVENT • ช่อง {specialEvent.cell}
            </span>
            <h2 className="text-2xl font-black text-white mb-2">
              {specialEvent.cell === 25 && 'โบนัสทอยเต๋าอีกครั้ง (Roll Again)'}
              {specialEvent.cell === 50 && 'ของขวัญเดินหน้า 3 ช่อง (Move Up 3)'}
              {specialEvent.cell === 75 && 'บูสต์คะแนนพิเศษ +50 (Score Boost)'}
            </h2>
            <p className="text-gray-300 text-sm mb-6 leading-relaxed">
              {isMySpecialEvent
                ? `ยินดีด้วย ${myDisplayName}! คุณตกช่องพิเศษ ${specialEvent.cell} ได้รับสิทธิ์ทำกิจกรรมพิเศษประจำช่อง`
                : `ผู้เล่น ${specialPlayerName} กำลังทำกิจกรรมพิเศษช่อง ${specialEvent.cell} (กรุณารอสักครู่)`}
            </p>

            {isMySpecialEvent ? (
              <button
                onClick={handleCompleteSpecialEvent}
                className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-900 font-black rounded-xl text-lg shadow-[0_4px_0_0_#b45309] hover:translate-y-0.5 transition-all flex items-center justify-center gap-2"
              >
                <span>🎁</span> รับรางวัลและดำเนินการต่อ
              </button>
            ) : (
              <div className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 text-sm font-bold flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 animate-spin text-amber-400" /> รอผู้เล่นดำเนินการ...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="relative z-10 w-full px-4 sm:px-6 py-4 flex items-center justify-between border-b border-white/10 bg-[#0C1F26]/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#A3E635] rounded-full flex items-center justify-center shadow-lg border-2 border-white/20 text-2xl">
            🐍
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white leading-tight drop-shadow-md">Knowledge Snake</h1>
            <p className="text-xs text-yellow-300 font-bold drop-shadow-md">เกมบันไดงูพิชิตความรู้</p>
          </div>
        </div>

        {/* Center: PIN & Role Toggle */}
        <div className="flex items-center gap-3">
          <div className="bg-[#122A36]/90 rounded-full px-5 py-2 border border-white/10 shadow-xl flex items-center gap-2">
            <span className="text-gray-300 font-bold text-xs sm:text-sm">PIN:</span>
            <span className="text-emerald-400 font-black text-xl tracking-wider">{pin}</span>
          </div>

          {/* Quick Role Switcher for complete teacher & student testing */}
          <div className="bg-[#122A36]/90 rounded-full p-1 border border-white/10 shadow-xl flex items-center gap-1">
            <button
              onClick={() => setRole('teacher')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                isTeacher ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>👨‍🏫</span> ครู
            </button>
            <button
              onClick={() => setRole('student')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                !isTeacher ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" /> นักเรียน
            </button>
          </div>
        </div>

        {/* Right: Current Active User Profile */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-white drop-shadow-md">
              {isTeacher ? 'ครูผู้สอน' : myDisplayName}
            </p>
            <p className="text-xs text-gray-300 drop-shadow-md">
              {isTeacher ? 'Teacher' : `Student (${myPlayerId})`}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-indigo-500 border-2 border-white/20 flex items-center justify-center text-lg overflow-hidden shadow-lg">
            {isTeacher ? '👨‍🏫' : <Avatar avatarId={myPlayer?.avatarId || 'avatar-09'} />}
          </div>
          <button
            onClick={() => setShowPodium(true)}
            className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/30 flex items-center gap-1.5 transition-colors shadow-sm"
            title="ดูโพเดียมสรุปผลคะแนน"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">โพเดียม</span>
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-10 h-10 rounded-xl bg-[#122A36]/90 border border-white/10 flex items-center justify-center hover:bg-red-500/80 transition text-gray-300 hover:text-white shadow-xl"
            title="ออกจากเกม"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 w-full px-4 sm:px-6 py-4 flex flex-col gap-5 max-w-[1600px] mx-auto min-h-0">
        
        {/* Top 3 Columns: Leaderboard | Board | Question + Controls */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[260px_1fr_360px] gap-5 min-h-0">
          
          {/* LEFT: Leaderboard */}
          <div className="bg-[#122A36]/95 backdrop-blur-md rounded-3xl border border-white/10 flex flex-col shadow-2xl overflow-hidden h-[580px] lg:h-auto">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                ผู้เล่น ({displayPlayers.length})
              </h3>
              <span className="text-[11px] text-gray-400">รอบที่ {gameState?.currentRound || 0}/{gameState?.totalRounds || 10}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
              {[...displayPlayers]
                .sort((a, b) => b.score - a.score)
                .map((p, i) => (
                  <div
                    key={p.playerId}
                    className={`flex items-center justify-between p-2.5 rounded-2xl transition border ${
                      p.playerId === myPlayerId
                        ? 'bg-emerald-500/15 border-emerald-500/30'
                        : 'border-transparent hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center border border-white/20 shadow-sm overflow-hidden">
                        <Avatar avatarId={p.avatarId} />
                      </div>
                      <div className="text-left">
                        <span className="font-bold text-xs sm:text-sm text-gray-100 block leading-tight">
                          {p.displayName} {p.playerId === myPlayerId && ' (ฉัน)'}
                        </span>
                        <span className="text-[10px] text-gray-400">ช่อง {p.position}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-gray-200">{p.score}</span>
                      {i === 0 ? <Crown className="w-4 h-4 text-yellow-400 drop-shadow-sm" /> : <div className="w-4" />}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* CENTER: GameBoard */}
          <div className="flex items-center justify-center p-2">
            <div className="w-full max-w-[620px] aspect-square rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] border-4 border-[#3D6B4F]/50 ring-4 ring-[#223F2D]/50 bg-[#83D160]">
              <GameBoard
                players={displayPlayers}
                currentPlayerId={gameState?.currentPlayerId || displayPlayers[0]?.playerId}
                diceValue={diceDisplayValue}
                isRolling={isRolling}
                round={gameState?.currentRound || 1}
                gameStatus={gameState?.gameStatus === 'moving' ? 'moving' : 'rolling'}
                mode="play"
              />
            </div>
          </div>

          {/* RIGHT: Question + Teacher Controls + Dice Card */}
          <div className="flex flex-col gap-4 h-full">
            
            {/* Teacher Control Card (When user is in Teacher role) */}
            {isTeacher && (
              <div className="bg-[#122A36]/95 backdrop-blur-md rounded-3xl border border-indigo-500/30 p-4 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>👨‍🏫</span> แผงควบคุมครูผู้สอน
                  </span>
                  <span className="text-[11px] bg-indigo-500/20 px-2 py-0.5 rounded-full text-indigo-200 font-bold border border-indigo-500/30">
                    สถานะ: {gameState?.gameStatus || 'waiting_for_question'}
                  </span>
                </div>

                {/* Requirement 2: Teacher starts question button */}
                {(!gameState || gameState.gameStatus === 'waiting_for_question' || gameState.gameStatus === 'round_complete' || gameState.gameStatus === 'lobby') && (
                  <button
                    onClick={handleTeacherStartQuestion}
                    disabled={gameState?.gameStatus === 'special_event'}
                    className="w-full py-3 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 disabled:opacity-50 text-white rounded-xl font-black text-sm shadow-[0_4px_0_0_#4338ca] hover:translate-y-0.5 transition-all flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    เริ่มคำถามข้อที่ {(gameState?.currentRound || 0) + 1}
                  </button>
                )}

                {/* Requirement 4 & 5: Teacher Advance Button during Question */}
                {gameState?.gameStatus === 'question' && (
                  <div className="space-y-2">
                    <button
                      onClick={handleTeacherAdvanceQuestion}
                      disabled={!gameState.allPlayersAnswered && questionTimeRemaining > 0}
                      className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 disabled:hover:from-emerald-500 disabled:hover:to-teal-600 text-white rounded-xl font-black text-sm shadow-[0_4px_0_0_#059669] hover:translate-y-0.5 transition-all flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      ไปต่อ (Advance)
                    </button>
                    <p className="text-[11px] text-center font-bold text-gray-300">
                      {gameState.allPlayersAnswered ? (
                        <span className="text-emerald-400 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> นักเรียนตอบครบทุกคนแล้ว! กดไปต่อได้ทันที
                        </span>
                      ) : (
                        <span className="text-amber-300">
                          ⏳ รอนักเรียนตอบครบ หรือรอหมดเวลา ({questionTimeRemaining}s)
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {/* Requirement 9: Special Event active warning */}
                {gameState?.gameStatus === 'special_event' && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-bold flex items-center gap-2">
                    <span>⚠️</span>
                    <span>กิจกรรมพิเศษกำลังดำเนินอยู่ - ไม่สามารถเริ่มคำถามใหม่ได้จนกว่าจะเสร็จสิ้น</span>
                  </div>
                )}
              </div>
            )}

            {/* Question Card (Requirement 1: Student Choice Clicking) */}
            <div className="bg-[#122A36]/95 backdrop-blur-md rounded-3xl border border-white/10 p-4 shadow-xl flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between text-gray-300 font-bold text-xs mb-3">
                <span className="flex items-center gap-1 text-amber-300">
                  <Sparkles className="w-4 h-4" /> ข้อที่ {(gameState?.currentRound || 1)}/{gameState?.totalRounds || 10}
                </span>
                {gameState?.gameStatus === 'question' && (
                  <span className="bg-red-500/20 text-red-300 border border-red-500/30 px-2.5 py-0.5 rounded-full text-xs font-black flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 animate-spin" /> {questionTimeRemaining}s
                  </span>
                )}
              </div>

              {/* Question Body */}
              <div className="bg-white rounded-2xl p-4 flex-1 shadow-inner text-gray-900 flex flex-col relative overflow-hidden">
                {gameState?.gameStatus === 'lobby' ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center text-3xl shadow-sm">
                      🎮
                    </div>
                    <div>
                      <h4 className="font-extrabold text-base text-gray-900 mb-1">
                        {isTeacher ? 'ห้องเรียนสดเปิดอยู่ (Lobby)' : `ยินดีต้อนรับ ${myDisplayName || 'นักเรียน'}!`}
                      </h4>
                      <p className="text-xs text-gray-500 max-w-xs mx-auto">
                        {isTeacher
                          ? `มีนักเรียนในห้อง ${displayPlayers.length} คน • กดปุ่ม "เริ่มคำถาม" ด้านบนเพื่อเริ่มข้อแรก`
                          : 'คุณเชื่อมต่อเข้าห้องเรียนสดเรียบร้อยแล้ว กำลังรอคุณครูกดเริ่มคำถามข้อแรก...'}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      พร้อมแข่งขันบนกระดาน 100 ช่อง
                    </div>
                  </div>
                ) : gameState?.gameStatus === 'waiting_for_question' ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-3">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <h4 className="font-extrabold text-base text-gray-800 mb-1">
                      {isTeacher ? 'กด "เริ่มคำถาม" เพื่อเริ่มรอบใหม่' : 'รอคุณครูเริ่มคำถาม...'}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {isTeacher
                        ? 'เมื่อเริ่มคำถาม ระบบจะนับถอยหลัง 3 วินาทีให้นักเรียนเตรียมตัว'
                        : 'เตรียมพร้อมสำหรับคำถามข้อถัดไป'}
                    </p>
                  </div>
                ) : (
                  <>
                    <h4 className="font-extrabold text-[15px] mb-3 leading-snug text-gray-900">
                      {currentQuestion?.question || 'กำลังโหลดคำถาม...'}
                    </h4>

                    {/* Requirement 1: Choice Buttons A, B, C, D */}
                    <div className="space-y-2 flex-1 overflow-y-auto">
                      {(currentQuestion?.choices || ['ก', 'ข', 'ค', 'ง']).map((c, i) => {
                        const isChosen = selectedAnswer === i;
                        const hasAnswered = myPlayer?.status === 'answered';
                        const disabled = gameState?.gameStatus !== 'question' || hasAnswered || isSubmittingAnswer;

                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSelectAnswer(i)}
                            disabled={disabled}
                            className={`w-full text-left px-3.5 py-2.5 rounded-xl border-2 transition font-bold text-xs sm:text-sm flex items-center gap-3 ${
                              isChosen
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm'
                                : 'border-gray-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/40 text-gray-800 disabled:hover:border-gray-200 disabled:hover:bg-white'
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                                isChosen ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {['A', 'B', 'C', 'D'][i]}
                            </span>
                            <span className="flex-1">{c}</span>
                            {isChosen && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Answer Status Message */}
                    {myPlayer?.status === 'answered' && (
                      <div className="mt-3 bg-emerald-500 text-white p-2.5 rounded-xl font-extrabold text-xs text-center flex items-center justify-center gap-2 shadow-sm">
                        <CheckCircle2 className="w-4 h-4" /> ส่งคำตอบเรียบร้อยแล้ว!
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Dice Card (Requirement 6: Answer correct rolls dice) */}
            <div className="bg-[#122A36]/95 backdrop-blur-md rounded-3xl border border-white/10 p-4 shadow-xl text-center shrink-0">
              <div className="flex items-center justify-between text-gray-300 font-bold text-xs mb-3">
                <span className="text-emerald-400 flex items-center gap-1">🎲 ทอยลูกเต๋า</span>
                <span className="text-[11px] text-gray-400">
                  {gameState?.gameStatus === 'rolling'
                    ? isCurrentRoller
                      ? '⭐ ตาคุณทอย!'
                      : `รอ: ${currentRollerName}`
                    : 'รอบทอยเต๋า'}
                </span>
              </div>

              <div className="flex justify-center mb-3">
                <DiceFace value={diceDisplayValue} />
              </div>

              <button
                onClick={handleRollDice}
                disabled={!isCurrentRoller || isRolling}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500 text-white rounded-xl font-black text-base shadow-[0_4px_0_0_#059669] hover:translate-y-0.5 transition-all"
              >
                {isRolling
                  ? 'กำลังทอย...'
                  : isCurrentRoller
                  ? 'ทอยเลย!'
                  : `รอคุณ ${currentRollerName} ทอยเต๋า`}
              </button>
            </div>

          </div>
        </div>

        {/* Bottom Bar: Player Status */}
        <div className="bg-[#122A36]/95 backdrop-blur-md rounded-3xl border border-white/10 p-3.5 shadow-xl flex items-center gap-4 shrink-0">
          <div className="w-14 h-14 bg-[#0B1A24] rounded-2xl flex items-center justify-center border border-white/10 relative">
            <div className="w-10 h-10">
              <Avatar avatarId={myPlayer?.avatarId || 'avatar-09'} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-[#122A36] flex items-center justify-center">
              <Crown className="w-3 h-3 text-white" />
            </div>
          </div>

          <div className="flex-1 max-w-xs">
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-base font-extrabold text-white tracking-wide">{myPlayer?.displayName}</h2>
              <span className="text-xs text-emerald-400 font-bold">({isTeacher ? 'โหมดครู' : 'โหมดนักเรียน'})</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-300 font-medium mb-1.5">
              <span>ช่องปัจจุบัน: <strong className="text-white">{myPlayer?.position || 1}</strong></span>
              <span>คะแนน: <strong className="text-white">{myPlayer?.score || 1}</strong></span>
            </div>
            <div className="h-2 w-full bg-[#0B1A24] rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all"
                style={{ width: `${Math.min(100, ((myPlayer?.score || 1) / 100) * 100)}%` }}
              />
            </div>
          </div>

          <div className="hidden md:flex ml-auto px-4 py-2.5 bg-[#1A3A4A]/50 rounded-2xl border border-white/5 items-center gap-3">
            <span className="text-yellow-400 text-lg">💡</span>
            <span className="text-gray-300 font-bold text-xs">
              ตอบถูกจึงได้สิทธิ์ทอยลูกเต๋า • หากทอยลงช่องพิเศษ 25, 50, 75 เกมจะหยุดชั่วคราวเพื่อทำกิจกรรม
            </span>
          </div>
        </div>

        {/* Game Finish Podium Modal */}
        <GamePodiumModal
          isOpen={showPodium || gameState?.gameStatus === 'finished'}
          onClose={() => setShowPodium(false)}
          players={gameState?.players || []}
          gamePin={pin}
          onPlayAgain={() => {
            setShowPodium(false);
            if (isTeacher) {
              router.push('/teacher/dashboard');
            }
          }}
        />

      </div>
    </main>
  );
}