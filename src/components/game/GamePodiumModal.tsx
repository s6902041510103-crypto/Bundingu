'use client';

import React from 'react';
import {
  Trophy,
  Crown,
  Sparkles,
  RotateCcw,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { Avatar } from '@/components/avatars/AvatarSVGs';
import { AVATARS, getJoinBonusMultiplier } from '@/lib/game-data';
import type { Player } from '@/domain/types';

function PrinterIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
  );
}

function CloseIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

interface GamePodiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: readonly Player[] | Player[];
  gamePin?: string;
  onPlayAgain?: () => void;
}

export function GamePodiumModal({
  isOpen,
  onClose,
  players,
  gamePin = 'KS8821',
  onPlayAgain,
}: GamePodiumModalProps) {
  if (!isOpen) return null;

  // Sort players by finalScore (or score) descending, then position descending
  const sortedPlayers = [...players].sort((a, b) => {
    const scoreA = a.finalScore ?? a.score ?? 0;
    const scoreB = b.finalScore ?? b.score ?? 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return (b.position || 0) - (a.position || 0);
  });

  const firstPlace = sortedPlayers[0];
  const secondPlace = sortedPlayers[1];
  const thirdPlace = sortedPlayers[2];

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl bg-gradient-to-b from-[#0F2330] to-[#0A1822] text-white rounded-3xl border border-white/10 shadow-2xl overflow-hidden print:border-none print:shadow-none print:bg-white print:text-black print:w-full print:max-w-none">
        {/* Header Bar */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                สรุปผลการแข่งขัน Knowledge Snake
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                  PIN: {gamePin}
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                คะแนนคำนวณจาก: (ตำแหน่งสุดท้าย + โบนัสเข้าเส้นชัย) × โบนัสลำดับการเข้าห้อง
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1.5 transition-colors border border-white/10"
              title="พิมพ์รายงานสรุปผลคะแนน"
            >
              <PrinterIcon className="w-4 h-4 text-emerald-400" />
              <span>พิมพ์รายงาน / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Header */}
        <div className="hidden print:block p-6 text-center border-b border-gray-300">
          <h1 className="text-2xl font-black text-gray-900">ใบรายงานสรุปผลคะแนน: เกมบันไดงูพิชิตความรู้ (Knowledge Snake)</h1>
          <p className="text-sm text-gray-600 mt-1">
            ห้องเกม PIN: {gamePin} • วันที่: {new Date().toLocaleDateString('th-TH')} • จำนวนผู้เล่น: {sortedPlayers.length} คน
          </p>
        </div>

        {/* 🥇 🥈 🥉 PODIUM SECTION */}
        <div className="p-6 sm:p-8 bg-gradient-to-b from-[#163548]/60 to-transparent print:hidden">
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-400/30 animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              ยินดีด้วยกับผู้ชนะทั้ง 3 อันดับ!
            </span>
          </div>

          <div className="flex items-end justify-center gap-3 sm:gap-6 max-w-lg mx-auto pt-4 pb-2">
            {/* 2nd Place Podium */}
            {secondPlace && (
              <div className="flex-1 flex flex-col items-center">
                <div className="relative mb-2 flex flex-col items-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-800/80 border-2 border-slate-300 shadow-lg flex items-center justify-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12">
                      <Avatar avatarId={secondPlace.avatarId || 'avatar-05'} />
                    </div>
                  </div>
                  <div className="absolute -top-3 w-6 h-6 rounded-full bg-slate-200 text-slate-800 text-xs font-black flex items-center justify-center shadow">
                    2
                  </div>
                </div>
                <p className="font-black text-sm text-white truncate max-w-[100px] text-center">
                  {secondPlace.displayName}
                </p>
                <p className="text-xs font-extrabold text-slate-300">
                  {secondPlace.finalScore ?? secondPlace.score} แต้ม
                </p>
                <div className="w-full h-24 sm:h-28 bg-gradient-to-t from-slate-700/80 to-slate-500/40 rounded-t-2xl border-t-2 border-x-2 border-slate-300 flex flex-col items-center justify-center p-2 mt-2 shadow-inner">
                  <span className="text-2xl sm:text-3xl">🥈</span>
                  <span className="text-[11px] font-bold text-slate-200 mt-1">รองอันดับ 1</span>
                </div>
              </div>
            )}

            {/* 1st Place Podium (Tallest & Center) */}
            {firstPlace && (
              <div className="flex-1 flex flex-col items-center -mt-4">
                <div className="relative mb-2 flex flex-col items-center">
                  <div className="absolute -top-5 text-amber-400 animate-bounce">
                    <Crown className="w-7 h-7 fill-current drop-shadow" />
                  </div>
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-950/60 border-2 border-amber-400 shadow-xl shadow-amber-500/20 flex items-center justify-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16">
                      <Avatar avatarId={firstPlace.avatarId || 'avatar-09'} />
                    </div>
                  </div>
                  <div className="absolute -top-2 w-6 h-6 rounded-full bg-amber-400 text-amber-950 text-xs font-black flex items-center justify-center shadow">
                    1
                  </div>
                </div>
                <p className="font-black text-base text-amber-300 truncate max-w-[120px] text-center">
                  {firstPlace.displayName}
                </p>
                <p className="text-sm font-black text-amber-400">
                  {firstPlace.finalScore ?? firstPlace.score} แต้ม
                </p>
                <div className="w-full h-32 sm:h-36 bg-gradient-to-t from-amber-600/60 via-amber-500/30 to-amber-400/20 rounded-t-2xl border-t-2 border-x-2 border-amber-400 flex flex-col items-center justify-center p-2 mt-2 shadow-inner">
                  <span className="text-3xl sm:text-4xl">🥇</span>
                  <span className="text-xs font-black text-amber-300 mt-1">แชมเปียน</span>
                </div>
              </div>
            )}

            {/* 3rd Place Podium */}
            {thirdPlace && (
              <div className="flex-1 flex flex-col items-center">
                <div className="relative mb-2 flex flex-col items-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-950/40 border-2 border-amber-600/70 shadow-lg flex items-center justify-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12">
                      <Avatar avatarId={thirdPlace.avatarId || 'avatar-02'} />
                    </div>
                  </div>
                  <div className="absolute -top-3 w-6 h-6 rounded-full bg-amber-700 text-white text-xs font-black flex items-center justify-center shadow">
                    3
                  </div>
                </div>
                <p className="font-black text-sm text-white truncate max-w-[100px] text-center">
                  {thirdPlace.displayName}
                </p>
                <p className="text-xs font-extrabold text-amber-300/80">
                  {thirdPlace.finalScore ?? thirdPlace.score} แต้ม
                </p>
                <div className="w-full h-20 sm:h-24 bg-gradient-to-t from-amber-900/60 to-amber-700/30 rounded-t-2xl border-t-2 border-x-2 border-amber-700/80 flex flex-col items-center justify-center p-2 mt-2 shadow-inner">
                  <span className="text-2xl sm:text-3xl">🥉</span>
                  <span className="text-[11px] font-bold text-amber-300 mt-1">รองอันดับ 2</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FULL LEADERBOARD & DETAILED STATISTICS TABLE */}
        <div className="p-5 sm:p-6 overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white print:text-gray-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 print:text-gray-700" />
              ตารางคะแนนและสถิติรายบุคคล (Full Scoreboard & Statistics)
            </h3>
            <span className="text-xs text-gray-400 print:text-gray-600">
              ผู้เล่นทั้งหมด {sortedPlayers.length} คน
            </span>
          </div>

          <table className="w-full text-left text-xs border-collapse print:text-black">
            <thead>
              <tr className="border-b border-white/10 print:border-gray-300 text-gray-400 print:text-gray-600 font-bold">
                <th className="py-2.5 px-3">อันดับ</th>
                <th className="py-2.5 px-3">ผู้เล่น</th>
                <th className="py-2.5 px-2 text-center">ลำดับเข้าห้อง / โบนัส</th>
                <th className="py-2.5 px-2 text-center">ช่องที่จบ</th>
                <th className="py-2.5 px-2 text-center">คะแนนฐาน</th>
                <th className="py-2.5 px-3 text-right">คะแนนสุทธิ</th>
                <th className="py-2.5 px-2 text-center print:table-cell">ตอบถูก/ผิด</th>
                <th className="py-2.5 px-2 text-center print:table-cell">งู/บันได</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 print:divide-gray-200 font-medium">
              {sortedPlayers.map((player, idx) => {
                const rank = idx + 1;
                const avatar = AVATARS.find((a) => a.id === player.avatarId) || AVATARS[idx % AVATARS.length];
                const multiplier = player.bonusMultiplier ?? getJoinBonusMultiplier(player.joinOrder ?? rank);
                const baseScore = player.baseScore ?? player.position ?? 1;
                const finalScore = player.finalScore ?? player.score ?? baseScore * multiplier;

                return (
                  <tr
                    key={player.playerId}
                    className={`hover:bg-white/5 print:hover:bg-transparent transition-colors ${
                      rank === 1
                        ? 'bg-amber-500/10 font-bold'
                        : rank === 2
                        ? 'bg-slate-400/10'
                        : rank === 3
                        ? 'bg-amber-700/10'
                        : ''
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        {rank === 1 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-black text-xs flex items-center justify-center">
                            1
                          </span>
                        ) : rank === 2 ? (
                          <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-900 font-black text-xs flex items-center justify-center">
                            2
                          </span>
                        ) : rank === 3 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center">
                            3
                          </span>
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-white/10 text-gray-300 font-bold text-xs flex items-center justify-center print:text-gray-700 print:bg-gray-100">
                            {rank}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-lg print:border print:border-gray-200">
                          {avatar.emoji}
                        </div>
                        <div>
                          <p className="font-bold text-white print:text-gray-900">{player.displayName}</p>
                          <p className="text-[10px] text-gray-400 print:text-gray-500">
                            {avatar.animal} ({avatar.nameEn})
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-extrabold ${
                          multiplier === 5
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30 print:border-amber-500 print:text-amber-900'
                            : multiplier === 4
                            ? 'bg-slate-300/20 text-slate-200 border border-slate-300/30 print:border-slate-500 print:text-slate-900'
                            : multiplier === 3
                            ? 'bg-amber-600/20 text-amber-300 border border-amber-600/30'
                            : multiplier === 2
                            ? 'bg-blue-400/20 text-blue-300 border border-blue-400/30'
                            : 'bg-white/5 text-gray-400'
                        }`}
                      >
                        คนที่ {player.joinOrder ?? rank} (×{multiplier})
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center font-mono font-bold text-emerald-400 print:text-emerald-700">
                      {player.position} / 100
                    </td>
                    <td className="py-3 px-2 text-center text-gray-300 print:text-gray-700">
                      {baseScore}
                      {player.finishBonus ? (
                        <span className="text-[10px] text-amber-400 ml-1 font-bold">
                          (+{player.finishBonus})
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-sm font-black text-amber-400 print:text-amber-800 font-mono">
                        {finalScore}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center text-gray-400 print:text-gray-600">
                      <span className="text-emerald-400 font-bold">{player.correctAnswersCount || 0}</span>
                      <span className="mx-1">/</span>
                      <span className="text-rose-400">{player.wrongAnswersCount || 0}</span>
                    </td>
                    <td className="py-3 px-2 text-center text-gray-400 print:text-gray-600">
                      <span className="text-rose-400 font-bold" title="โดนงูกัด">
                        🐍 {player.snakesHitCount || 0}
                      </span>
                      <span className="mx-1.5">|</span>
                      <span className="text-emerald-400 font-bold" title="ขึ้นบันได">
                        🪜 {player.laddersUsedCount || 0}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/5 print:hidden">
          <div className="text-xs text-gray-400 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            <span>สูตรคะแนนสุทธิ = [ช่องที่เดินถึง (1-100) + โบนัสเข้าเส้นชัย] × โบนัสเข้าห้องเร็ว</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onPlayAgain && (
              <button
                onClick={onPlayAgain}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md"
              >
                <RotateCcw className="w-4 h-4" />
                <span>เล่นใหม่อีกรอบ</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
            >
              ปิดหน้านี้
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
