"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createInitialGameState } from "@/lib/game-state";
import { createProductionTransport } from "@/lib/transport";
import { Badge } from "@/components/ui/Badge";
import { KnowledgeSnakeLogo } from "@/components/ui/Logo";
import { QRCodeSVG } from "@/components/ui/QRCode";
import { Avatar } from "@/components/game/Avatar";
import { GameBoardWrapper } from "@/components/game/GameBoard";
import { Leaderboard } from "@/components/game/Leaderboard";
import { SoundToggle } from "@/components/game/SoundToggle";
import { ConfettiCanvas } from "@/components/game/ConfettiEffect";
import type { GameState } from "@/lib/types";
import { Clock, Monitor, CheckCircle, Trophy, Sparkles } from "lucide-react";

/**
 * Projector View (Strictly Read-Only 16:9 Classroom Display)
 * - NEVER sends any game command to the server
 * - NEVER reveals correctOptionId before Server `question.revealed === true`
 */
export default function ProjectorViewPage() {
  const params = useParams<{ pin: string }>();
  const pin = String(params?.pin || "KS4829").toUpperCase();
  const [originUrl, setOriginUrl] = useState("http://localhost:3000");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOriginUrl(window.location.origin);
    }
  }, []);

  const [state, setState] = useState<GameState>(() =>
    createInitialGameState({
      game: {
        id: `game-${pin}`,
        pin,
        title: "Math Challenge",
        subject: "คณิตศาสตร์",
        grade: "มัธยมศึกษา",
        hostName: "ครูผู้สอน",
        school: "โรงเรียนสาธิต",
      },
    }),
  );

  useEffect(() => {
    const transport = createProductionTransport(pin, state, {
      pollIntervalMs: 1000,
    });
    const unsubscribe = transport.subscribe((newState) => {
      setState(newState);
    });
    return () => {
      unsubscribe();
      transport.destroy?.();
    };
  }, [pin]);

  const timeLeftFormatted = state.question
    ? `00:${String(state.question.timeLeft).padStart(2, "0")}`
    : "00:00";

  const isRevealed = Boolean(state.question?.revealed);

  return (
    <div className="min-h-screen bg-arena-navy text-white font-body flex flex-col overflow-x-hidden select-none">
      {/* Top 16:9 Header Bar (Matches Reference Screen #5 in bottom row) */}
      <header className="bg-[#08152c]/95 border-b border-blue-400/25 px-6 py-3">
        <div className="mx-auto max-w-[1600px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <KnowledgeSnakeLogo size="md" theme="dark" />
            <div className="px-4 py-1.5 rounded-full bg-blue-950/90 border border-blue-400/30 font-mono font-black text-lg text-amber-300 tracking-wider">
              KEY: {pin}
            </div>
            <Badge variant="info" size="md">
              <Monitor className="w-3.5 h-3.5 mr-1" />
              Projector View (Read-only)
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            <div className="px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 font-display font-bold text-emerald-300 text-base">
              🐍 รอบที่ {Math.max(1, state.round)}/{state.totalRounds}
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-blue-400/30 font-mono font-extrabold text-xl text-amber-300">
              <Clock className="w-5 h-5 text-amber-400" />
              <span>{timeLeftFormatted}</span>
            </div>

            <SoundToggle />
          </div>
        </div>
      </header>

      {/* Main 16:9 Widescreen Body */}
      <main className="flex-1 mx-auto max-w-[1600px] w-full p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-full">
          {/* Left 7 Columns: Large 10x10 Game Board + Bottom Player Strip */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <GameBoardWrapper
              players={state.players}
              currentPlayerId={state.currentPlayerId}
              movingPlayerId={state.movingPlayerId}
              mode="game"
            />

            {/* Bottom Player Strip with Projector Badge */}
            <div className="bg-[#0b1d3d]/90 border border-blue-400/25 rounded-2xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 overflow-x-auto">
                {state.leaderboard.slice(0, 6).map((entry) => (
                  <div
                    key={entry.playerId}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/75 border border-white/10 shrink-0"
                  >
                    <Avatar avatarId={entry.avatarId} size="sm" />
                    <div>
                      <span className="font-display font-bold text-sm text-white block">
                        {entry.name}
                      </span>
                      <span className="font-mono text-xs text-amber-300">
                        ช่องที่ {entry.position}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-blue-500/20 border border-blue-400/30 text-xs font-display font-bold text-blue-200 shrink-0">
                Projector
              </div>
            </div>
          </div>

          {/* Right 5 Columns: Read-only Question Card + Live Leaderboard */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* Current Question Card (Read-only, never leaks correctOptionId before server reveal) */}
            <div className="rounded-3xl bg-white text-slate-900 p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-display font-extrabold text-blue-700 text-lg">
                  คำถามปัจจุบัน
                </span>
                <Badge
                  variant={
                    state.gameStatus === "finished"
                      ? "gold"
                      : isRevealed
                      ? "success"
                      : "primary"
                  }
                  size="md"
                >
                  {state.gameStatus === "lobby"
                    ? "รอครูเริ่มเกม"
                    : state.gameStatus === "finished"
                    ? "จบการแข่งขัน"
                    : isRevealed
                    ? "เฉลยคำตอบแล้ว"
                    : `ข้อที่ ${state.question?.number ?? 1}/${state.totalRounds}`}
                </Badge>
              </div>

              {state.question ? (
                <>
                  <p className="font-display font-bold text-xl text-[#0f2547] leading-snug">
                    {state.question.prompt}
                  </p>

                  <div className="space-y-2.5">
                    {state.question.options.map((opt, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      const isCorrectOption =
                        isRevealed &&
                        Boolean(state.question?.correctOptionId) &&
                        opt.id === state.question?.correctOptionId;

                      return (
                        <div
                          key={opt.id}
                          className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 font-display font-semibold text-base ${
                            isCorrectOption
                              ? "bg-emerald-50 border-emerald-500 text-emerald-900"
                              : "bg-slate-50 border-slate-200 text-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                isCorrectOption
                                  ? "bg-emerald-600 text-white"
                                  : "bg-white border border-slate-300 text-slate-700"
                              }`}
                            >
                              {letter}
                            </span>
                            <span>{opt.text}</span>
                          </div>
                          {isCorrectOption && (
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="py-4 flex flex-col sm:flex-row items-center justify-center gap-6 text-center sm:text-left">
                  <div className="space-y-2">
                    <span className="text-xs font-display font-bold uppercase tracking-wider text-blue-600 block">
                      คีย์ห้องเกม (Room Key)
                    </span>
                    <div className="font-display text-4xl font-black text-[#0f2547] tracking-[0.2em]">
                      {pin}
                    </div>
                    <p className="text-sm text-slate-600 font-display">
                      สแกน QR Code หรือกรอกคีย์ที่หน้า{" "}
                      <span className="text-blue-600 font-bold">/join</span>
                    </p>
                  </div>
                  <QRCodeSVG
                    value={`${originUrl}/join?pin=${pin}`}
                    size={120}
                    label={`KEY: ${pin}`}
                  />
                </div>
              )}
            </div>

            {/* Active Special Event Banner on Projector */}
            {state.activeSpecialEvent && !state.activeSpecialEvent.resolved && (
              <div
                className={`rounded-2xl p-4 shadow-xl flex items-center gap-3 animate-bounce-in border ${
                  state.activeSpecialEvent.kind === "snake"
                    ? "bg-gradient-to-r from-rose-600 to-red-800 text-white border-rose-400"
                    : state.activeSpecialEvent.kind === "ladder"
                    ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 border-yellow-200"
                    : state.activeSpecialEvent.kind === "shield"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-300"
                    : state.activeSpecialEvent.kind === "gem"
                    ? "bg-gradient-to-r from-teal-400 to-emerald-600 text-white border-teal-200"
                    : state.activeSpecialEvent.kind === "rocket"
                    ? "bg-gradient-to-r from-purple-500 to-indigo-700 text-white border-purple-300"
                    : "bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 border-amber-300"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-2xl shrink-0">
                  {state.activeSpecialEvent.kind === "snake"
                    ? "🐍"
                    : state.activeSpecialEvent.kind === "ladder"
                    ? "🪜"
                    : state.activeSpecialEvent.kind === "shield"
                    ? "🛡️"
                    : state.activeSpecialEvent.kind === "gem"
                    ? "💎"
                    : state.activeSpecialEvent.kind === "rocket"
                    ? "🚀"
                    : state.activeSpecialEvent.kind === "magnet"
                    ? "🧲"
                    : state.activeSpecialEvent.kind === "gift"
                    ? "🎁"
                    : "⭐"}
                </div>
                <div>
                  <p className="font-display font-black text-base">
                    {state.activeSpecialEvent.playerName}: {state.activeSpecialEvent.title}
                  </p>
                  <p className="text-xs font-medium opacity-90">
                    {state.activeSpecialEvent.description}
                  </p>
                </div>
              </div>
            )}

            {/* Live Leaderboard Table (Matches Reference Screen #5 bottom-right) */}
            <div className="rounded-3xl bg-[#0d2249]/95 border border-blue-400/30 p-5 shadow-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-blue-400/20 pb-2.5">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <h2 className="font-display font-bold text-lg text-white">
                    อันดับผู้เล่น (Leaderboard)
                  </h2>
                </div>
                <span className="text-xs text-blue-200">
                  ผู้เล่นทั้งหมด {state.players.length} คน
                </span>
              </div>

              <div className="grid grid-cols-12 text-xs font-display font-semibold text-blue-200/80 px-3">
                <span className="col-span-2">อันดับ</span>
                <span className="col-span-7">ชื่อผู้เล่น</span>
                <span className="col-span-3 text-right">คะแนน</span>
              </div>

              <Leaderboard
                entries={state.leaderboard.slice(0, 6)}
                highlightViewer={false}
                mode="compact"
                theme="dark"
              />
            </div>
          </div>
        </div>
      </main>

      {state.gameStatus === "finished" && (
        <ConfettiCanvas active={true} count={140} durationMs={6500} />
      )}
    </div>
  );
}
