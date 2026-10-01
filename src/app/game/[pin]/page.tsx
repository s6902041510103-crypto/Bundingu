'use client';

import React, { useState, useEffect } from 'react';
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
  LayoutGrid
} from 'lucide-react';

interface StudentSession {
  playerId: string;
  displayName: string;
  avatarId: string;
  gamePin: string;
}

const DEFAULT_PLAYERS = [
  { id: 'p1', name: 'น้องน้ำหวาน', avatar: '🐘', color: 'bg-indigo-500' },
  { id: 'p2', name: 'น้องกล้าหาญ', avatar: '🐯', color: 'bg-orange-500' },
  { id: 'p3', name: 'น้องฟ้าใส', avatar: '🐰', color: 'bg-pink-500' },
  { id: 'p4', name: 'น้องต้นกล้า', avatar: '🐿️', color: 'bg-emerald-500' },
];

export default function GameLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const rawPin = params.pin as string;
  const pin = rawPin ? rawPin.toUpperCase() : 'DEMO99';

  const [student, setStudent] = useState<StudentSession | null>(null);
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('student_session');
        if (saved) {
          const parsed = JSON.parse(saved);
          setStudent(parsed);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleCopyPin = () => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnterGame = () => {
    setIsStarting(true);
    router.push(`/game/${pin}/play`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 font-thai flex flex-col justify-between p-4 sm:p-8">
      {/* Header */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between">
        <Link href="/join" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm">
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
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            ห้องรอเริ่มเกม (Game Lobby)
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

          {/* Current Student Profile */}
          <div className="p-4 rounded-2xl bg-white border-2 border-indigo-200 shadow-sm max-w-sm mx-auto flex items-center gap-4 text-left">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-3xl shadow-md">
              {student ? '🎒' : '👤'}
            </div>
            <div className="flex-1 truncate">
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">ผู้เล่นของคุณ</span>
              <h3 className="font-bold text-lg text-gray-900 truncate">
                {student?.displayName || 'นักเรียนทั่วไป'}
              </h3>
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> เชื่อมต่อห้องเรียบร้อย
              </p>
            </div>
          </div>

          {/* Waiting animation */}
          <div className="py-2 text-sm text-gray-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            กำลังรอคุณครูกดเริ่มเกม หรือกดเริ่มทันทีด้านล่าง
          </div>

          {/* Other players list */}
          <div>
            <h4 className="text-xs font-bold text-gray-600 mb-3 flex items-center justify-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" />
              เพื่อนร่วมห้อง ({DEFAULT_PLAYERS.length + 1} คน)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-xl border-2 border-indigo-500 bg-indigo-50/50 flex items-center gap-2">
                <span className="text-xl">🎒</span>
                <div className="truncate text-left">
                  <p className="text-xs font-bold text-indigo-900 truncate">{student?.displayName || 'คุณ'}</p>
                  <span className="text-[10px] text-indigo-600 font-semibold">(คุณ)</span>
                </div>
              </div>
              {DEFAULT_PLAYERS.map((p) => (
                <div key={p.id} className="p-2.5 rounded-xl border border-gray-200 bg-white flex items-center gap-2">
                  <span className="text-xl">{p.avatar}</span>
                  <div className="truncate text-left">
                    <p className="text-xs font-medium text-gray-800 truncate">{p.name}</p>
                    <span className="text-[10px] text-emerald-600 font-medium">พร้อม</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action button */}
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
              href="/game/board"
              target="_blank"
              className="w-full sm:w-auto px-4 py-3.5 rounded-xl btn-secondary text-sm font-semibold flex items-center justify-center gap-1.5"
            >
              <LayoutGrid className="w-4 h-4 text-gray-500" />
              ดูแผนผังกระดาน 100 ช่อง
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
