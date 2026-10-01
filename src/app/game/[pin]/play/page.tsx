'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GameBoard } from '@/components/game/GameBoard';
import { GAME_CONFIG, calculateFinalPosition, isFinishCell } from '@/lib/game-data';
import { Avatar } from '@/components/avatars/AvatarSVGs';
import {
  LogOut, QrCode, Crown, CheckCircle2, Sparkles, Trophy
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { ChoiceIndex } from '@/domain/types';

interface MockPlayer {
  playerId: string;
  displayName: string;
  avatarId: string;
  position: number;
  score: number;
  color: string;
}

const PLAYER_COLORS = [
  'bg-indigo-500', 'bg-red-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-pink-500', 'bg-purple-500', 'bg-orange-500', 'bg-teal-500',
];

const MOCK_QUESTIONS = [
  {
    questionId: 'q1',
    question: 'ข้อใดคือสัตว์ที่มีการหายใจด้วยเหงือก?',
    choices: ['ปลา', 'นก', 'สุนัข', 'แมว'] as const,
    correctAnswer: 0 as ChoiceIndex,
    explanation: 'ปลาหายใจด้วยเหงือก',
  },
  {
    questionId: 'q2',
    question: '2 + 2 × 2 = ?',
    choices: ['6', '8', '4', '10'] as const,
    correctAnswer: 0 as ChoiceIndex,
    explanation: 'ตามลำดับการดำเนินการทางคณิตศาสตร์ ให้คูณก่อนบวก',
  },
];

function DiceFace({ value }: { value: number }) {
  const dots = [
    [],
    [5],
    [1, 9],
    [1, 5, 9],
    [1, 3, 7, 9],
    [1, 3, 5, 7, 9],
    [1, 2, 3, 7, 8, 9]
  ];
  return (
    <div className="w-16 h-16 bg-white rounded-2xl shadow-[0_4px_0_0_#e2e8f0] border border-gray-100 grid grid-cols-3 grid-rows-3 p-2 gap-1">
       {Array.from({ length: 9 }).map((_, i) => (
         <div key={i} className="flex items-center justify-center">
            {dots[value]?.includes(i + 1) && <div className="w-2.5 h-2.5 bg-slate-800 rounded-full"></div>}
         </div>
       ))}
    </div>
  );
}

export default function GamePlayPage() {
  const params = useParams();
  const rawPin = params.pin as string;
  const pin = rawPin ? rawPin.toUpperCase() : '4827';

  const [currentRound, setCurrentRound] = useState(3);
  const totalRounds = 15;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Players state
  const [players, setPlayers] = useState<MockPlayer[]>([
    { playerId: 'p1', displayName: 'นัท', avatarId: 'avatar-09', position: 38, score: 38, color: PLAYER_COLORS[0] },
    { playerId: 'p2', displayName: 'มายด์', avatarId: 'avatar-05', position: 32, score: 32, color: PLAYER_COLORS[1] },
    { playerId: 'p3', displayName: 'อาร์ม', avatarId: 'avatar-02', position: 28, score: 28, color: PLAYER_COLORS[2] },
    { playerId: 'p4', displayName: 'จูน', avatarId: 'avatar-05', position: 24, score: 24, color: PLAYER_COLORS[3] },
    { playerId: 'p5', displayName: 'บอส', avatarId: 'avatar-04', position: 20, score: 20, color: PLAYER_COLORS[4] },
    { playerId: 'p6', displayName: 'พลอย', avatarId: 'avatar-06', position: 16, score: 16, color: PLAYER_COLORS[5] },
    { playerId: 'p7', displayName: 'กอล์ฟ', avatarId: 'avatar-01', position: 12, score: 12, color: PLAYER_COLORS[6] },
    { playerId: 'p8', displayName: 'แป้ง', avatarId: 'avatar-08', position: 8, score: 8, color: PLAYER_COLORS[7] },
  ]);

  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(0);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean>(true);
  const [diceValue, setDiceValue] = useState<1|2|3|4|5|6>(1);
  const [isRolling, setIsRolling] = useState(false);
  const [gamePhase, setGamePhase] = useState<'question' | 'can_roll' | 'moving'>('can_roll');

  const currentPlayer = players[0];
  const currentQuestion = MOCK_QUESTIONS[currentQuestionIndex % MOCK_QUESTIONS.length];

  const handleRollDice = () => {
    if (isRolling || gamePhase !== 'can_roll') return;
    setIsRolling(true);
    
    // Animate dice
    let rollCount = 0;
    const interval = setInterval(() => {
      setDiceValue((Math.floor(Math.random() * 6) + 1) as any);
      rollCount++;
      if (rollCount > 10) {
        clearInterval(interval);
        const finalRoll = (Math.floor(Math.random() * 6) + 1) as any;
        setDiceValue(finalRoll);
        setIsRolling(false);
        setGamePhase('moving');

        const { position: finalPos, path } = calculateFinalPosition(currentPlayer.position, finalRoll);
        const duration = Math.min(path.length * 400, 2500);

        setTimeout(() => {
          setPlayers(prev => prev.map((p, i) => i === 0 ? { ...p, position: finalPos, score: finalPos } : p));
          setGamePhase('question');
          setSelectedAnswer(null);
          setIsAnswerCorrect(false);
        }, duration);
      }
    }, 100);
  };

  return (
    <main className="min-h-screen bg-[#0C1F26] bg-[url('https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?q=80&w=2074&auto=format&fit=crop')] bg-cover bg-center bg-fixed font-thai flex flex-col relative overflow-hidden text-white">
      {/* Semi-transparent dark overlay to make UI pop */}
      <div className="absolute inset-0 bg-[#07161B]/60 backdrop-blur-sm z-0"></div>

      {/* Top Header */}
      <header className="relative z-10 w-full px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#A3E635] rounded-full flex items-center justify-center shadow-lg border-2 border-white/20 text-2xl">
            🐍
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white leading-tight drop-shadow-md">Knowledge Snake</h1>
            <p className="text-sm text-yellow-300 font-bold drop-shadow-md">เกมบันไดงูพิชิตความรู้</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-[#122A36]/90 backdrop-blur-md rounded-full px-6 py-2.5 border border-white/10 shadow-xl flex items-center gap-2">
            <span className="text-gray-300 font-bold">Game PIN:</span>
            <span className="text-emerald-400 font-black text-2xl tracking-wider">{pin}</span>
          </div>
          <button className="bg-[#122A36]/90 backdrop-blur-md rounded-full px-4 py-2 border border-white/10 shadow-xl flex items-center gap-2 hover:bg-[#1A3A4A] transition">
            <QrCode className="w-6 h-6 text-gray-300" />
            <div className="text-left leading-tight">
              <span className="text-sm text-gray-300 font-bold block">สแกน QR</span>
              <span className="text-[10px] text-gray-400 block">เพื่อเข้าร่วมเกม</span>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-bold text-white drop-shadow-md">ครูสมชาย</p>
            <p className="text-xs text-gray-300 drop-shadow-md">Teacher</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-indigo-500 border-2 border-white/20 flex items-center justify-center text-xl overflow-hidden shadow-lg">
             👨‍🏫
          </div>
          <button className="w-12 h-12 rounded-xl bg-[#122A36]/90 border border-white/10 flex items-center justify-center hover:bg-red-500/80 transition text-gray-300 hover:text-white shadow-xl">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 w-full px-4 sm:px-6 pb-6 flex flex-col gap-6 max-w-[1600px] mx-auto">
        
        {/* Top 3 Columns: Leaderboard | Board | Question/Dice */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-6 min-h-0">
          
          {/* LEFT: Leaderboard */}
          <div className="bg-[#122A36]/95 backdrop-blur-md rounded-3xl border border-white/5 flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-sm font-bold text-gray-200">ผู้เล่นในห้อง (12/40)</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {players.sort((a,b) => b.score - a.score).map((p, i) => (
                <div key={p.playerId} className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/5 transition">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center border-2 border-white/10 shadow-sm">
                        <Avatar avatarId={p.avatarId} />
                      </div>
                    </div>
                    <span className="font-bold text-sm text-gray-100">{p.displayName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[15px] text-gray-200">{p.score}</span>
                    {i === 0 && <Crown className="w-4 h-4 text-yellow-400 drop-shadow-sm" />}
                    {i !== 0 && <div className="w-4"></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CENTER: GameBoard */}
          <div className="flex items-center justify-center p-4">
            <div className="w-full max-w-[700px] aspect-square rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] border-4 border-[#3D6B4F]/50 ring-4 ring-[#223F2D]/50 bg-[#83D160]">
               <GameBoard
                 players={players}
                 currentPlayerId={currentPlayer.playerId}
                 diceValue={diceValue}
                 isRolling={isRolling}
                 round={currentRound}
                 gameStatus={gamePhase === 'moving' ? 'moving' : 'rolling'}
                 mode="play"
               />
            </div>
          </div>

          {/* RIGHT: Question + Dice */}
          <div className="flex flex-col gap-6 h-full">
            
            {/* Question Card */}
            <div className="bg-[#122A36]/95 backdrop-blur-md rounded-3xl border border-white/5 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex-1 flex flex-col">
              <div className="flex items-center gap-2 text-gray-300 font-bold text-sm mb-4">
                <span className="text-xl">✨</span> คำถามข้อที่ {currentRound}/{totalRounds}
              </div>
              
              <div className="bg-white rounded-2xl p-5 flex-1 shadow-inner text-gray-900 flex flex-col relative overflow-hidden">
                <h4 className="font-extrabold text-[17px] mb-5 leading-snug">{currentQuestion.question}</h4>
                <div className="space-y-2.5 flex-1">
                  {currentQuestion.choices.map((c, i) => {
                    const isSelected = selectedAnswer === i;
                    const isCorrect = isSelected && isAnswerCorrect;
                    return (
                      <button 
                        key={i}
                        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition font-bold text-sm flex items-center gap-3
                          ${isCorrect ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-gray-100 bg-white hover:border-gray-300'}
                        `}
                      >
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs
                          ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'}
                        `}>
                          {['A', 'B', 'C', 'D'][i]}
                        </span>
                        <span className="flex-1">{c}</span>
                        {isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                      </button>
                    )
                  })}
                </div>
                
                {/* Result Message */}
                {isAnswerCorrect && (
                  <div className="mt-4 bg-[#10B981] text-white p-3.5 rounded-xl font-extrabold text-center flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="w-5 h-5" /> ตอบถูก!
                  </div>
                )}
                {isAnswerCorrect && (
                  <p className="text-center text-[11px] text-gray-500 font-medium mt-2">ได้ทอยลูกเต๋าแล้ว!</p>
                )}
              </div>
            </div>

            {/* Dice Card */}
            <div className="bg-[#122A36]/95 backdrop-blur-md rounded-3xl border border-white/5 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] text-center shrink-0">
              <div className="flex items-center justify-center gap-2 text-gray-300 font-bold text-sm mb-4">
                <span className="text-emerald-400">⨉</span> ทอยลูกเต๋า
              </div>
              <div className="flex justify-center mb-5">
                <DiceFace value={diceValue} />
              </div>
              <button 
                onClick={handleRollDice} 
                disabled={gamePhase !== 'can_roll'}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 text-white rounded-xl font-extrabold text-lg shadow-[0_4px_0_0_#059669] hover:translate-y-1 hover:shadow-[0_0px_0_0_#059669] transition-all"
              >
                ทอยเลย!
              </button>
            </div>

          </div>
        </div>

        {/* Bottom Bar: Player Status & Mini Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 shrink-0">
          
          {/* Main Player Info */}
          <div className="bg-[#122A36]/95 backdrop-blur-md rounded-3xl border border-white/5 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex items-center gap-5">
            <div className="w-20 h-20 bg-[#0B1A24] rounded-2xl flex items-center justify-center border border-white/10 shadow-inner relative">
              <div className="w-14 h-14">
                 <Avatar avatarId={currentPlayer.avatarId} />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full border-2 border-[#122A36] flex items-center justify-center">
                 <Crown className="w-4 h-4 text-white" />
              </div>
            </div>
            
            <div className="flex-1 max-w-[200px]">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-extrabold text-white tracking-wide">{currentPlayer.displayName}</h2>
                <Crown className="w-5 h-5 text-yellow-400 drop-shadow-md" />
              </div>
              <div className="flex items-center justify-between text-sm text-gray-300 font-medium mb-2">
                <span>ช่องปัจจุบัน: <span className="text-white font-bold">{currentPlayer.position}</span></span>
                <span>คะแนน: <span className="text-white font-bold">{currentPlayer.score}</span></span>
              </div>
              <div className="h-2.5 w-full bg-[#0B1A24] rounded-full overflow-hidden border border-white/5 shadow-inner">
                <div className="h-full bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]" style={{ width: `${Math.min(100, (currentPlayer.score / 100) * 100)}%` }}></div>
              </div>
            </div>

            <div className="hidden xl:flex ml-auto px-6 py-4 bg-[#1A3A4A]/50 rounded-2xl border border-white/5 items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center">
                 <span className="text-yellow-400 text-lg">⭐</span>
              </div>
              <span className="text-gray-200 font-bold text-sm tracking-wide">ตอบคำถามถูกต้อง! คุณได้สิทธิ์ทอยลูกเต๋าแล้ว</span>
              <div className="w-8 h-8 opacity-60 ml-2">
                 <DiceFace value={6} />
              </div>
            </div>
          </div>

          {/* Mini Leaderboard */}
          <div className="bg-[#122A36]/95 backdrop-blur-md rounded-3xl border border-white/5 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col justify-center">
            <h4 className="text-[13px] font-bold text-gray-400 flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-yellow-500" /> อันดับคะแนน (ปัจจุบัน)
            </h4>
            <div className="space-y-2.5">
              {players.sort((a,b) => b.score - a.score).slice(0,3).map((p, i) => (
                <div key={p.playerId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-black text-yellow-500 w-4 text-center">{i + 1}</span>
                    <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center overflow-hidden border border-white/20">
                      <Avatar avatarId={p.avatarId} />
                    </div>
                    <span className="font-bold text-[13px] text-gray-200">{p.displayName}</span>
                  </div>
                  <span className="font-bold text-[13px] text-gray-300">{p.score}</span>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </main>
  );
}