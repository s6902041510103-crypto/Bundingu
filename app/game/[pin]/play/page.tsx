"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createInitialGameState } from "@/lib/game-state";
import { createProductionTransport, type GameStateTransport } from "@/lib/transport";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { KnowledgeSnakeLogo } from "@/components/ui/Logo";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { Avatar } from "@/components/game/Avatar";
import { GameBoardWrapper } from "@/components/game/GameBoard";
import { QuestionCard } from "@/components/game/QuestionCard";
import { Dice } from "@/components/game/Dice";
import { Leaderboard } from "@/components/game/Leaderboard";
import type { GameState } from "@/lib/types";
import {
  Clock,
  Trophy,
  Sparkles,
  Dice5,
  Users,
  CheckCircle2,
  Home,
} from "lucide-react";

export default function StudentGameplayPage() {
  const params = useParams<{ pin: string }>();
  const pin = String(params?.pin || "KS4829").toUpperCase();
  const { toasts, addToast, removeToast } = useToast();

  const [viewerId, setViewerId] = useState<string | null>(null);
  const [rollingAnim, setRollingAnim] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);

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

  const transportRef = useRef<GameStateTransport | null>(null);

  useEffect(() => {
    let playerId: string | null = null;
    try {
      const saved =
        sessionStorage.getItem(`ks-room-${pin}`) ||
        sessionStorage.getItem("ks-player");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.playerId) playerId = parsed.playerId;
      }
    } catch {
      // ignore
    }
    setViewerId(playerId);

    const transport = createProductionTransport(pin, state, {
      playerId,
      pollIntervalMs: 1000,
    });
    transportRef.current = transport;

    const unsubscribe = transport.subscribe((newState) => {
      setState(newState);
    });

    return () => {
      unsubscribe();
      transport.destroy?.();
    };
  }, [pin]);

  const viewerPlayer =
    state.players.find((p) => p.id === viewerId) ?? state.players[0] ?? null;

  const activeViewerId = viewerPlayer?.id ?? null;
  const isMyTurnToRoll =
    Boolean(activeViewerId) &&
    state.rollQueue[0] === activeViewerId &&
    (state.gameStatus === "dice" || state.gameStatus === "reveal") &&
    !(state.activeSpecialEvent && !state.activeSpecialEvent.resolved);

  const myQueuePosition = activeViewerId
    ? state.rollQueue.indexOf(activeViewerId) + 1
    : 0;

  const handleSubmitAnswer = async (optionId: string) => {
    if (!activeViewerId || !transportRef.current?.sendCommand) return;
    const res = await transportRef.current.sendCommand({
      type: "SUBMIT_ANSWER",
      playerId: activeViewerId,
      optionId,
    });
    if (!res.ok && res.error) {
      addToast({
        title: "ไม่สามารถส่งคำตอบได้",
        description: res.error,
        variant: "warning",
      });
    } else {
      addToast({
        title: "ส่งคำตอบสำเร็จ!",
        description: "รอผลเฉลยเมื่อหมดเวลาหรือเมื่อครูเฉลย",
        variant: "success",
      });
    }
  };

  const handleRollDice = async () => {
    if (!activeViewerId || !transportRef.current?.sendCommand || rollingAnim) return;
    setRollingAnim(true);
    setTimeout(async () => {
      const res = await transportRef.current?.sendCommand?.({
        type: "ROLL_DICE",
        playerId: activeViewerId,
      });
      setRollingAnim(false);
      if (res && !res.ok && res.error) {
        addToast({
          title: "ทอยลูกเต๋าไม่สำเร็จ",
          description: res.error,
          variant: "warning",
        });
      }
    }, 650);
  };

  const handleResolveSpecialEvent = async () => {
    if (!transportRef.current?.sendCommand) return;
    await transportRef.current.sendCommand({
      type: "RESOLVE_SPECIAL_EVENT",
      playerId: activeViewerId ?? undefined,
    });
  };

  const timeLeftFormatted = state.question
    ? `00:${String(state.question.timeLeft).padStart(2, "0")}`
    : "00:00";

  return (
    <div className="min-h-screen bg-arena-navy text-white font-body flex flex-col overflow-x-hidden">
      {/* Top Arena Header (Matches Reference Student Screens #3 and #4) */}
      <header className="sticky top-0 z-30 bg-[#08152c]/95 backdrop-blur-md border-b border-blue-400/20 px-3 sm:px-6 py-2.5">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4">
            <KnowledgeSnakeLogo size="sm" theme="dark" />
            <span className="text-xs sm:text-sm font-mono font-bold text-blue-200 bg-blue-950/80 border border-blue-400/25 px-2.5 py-1 rounded-full">
              PIN: {pin}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Round Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-display font-bold text-xs sm:text-sm">
              <span>🐍</span>
              <span>
                {Math.max(1, state.round)}/{state.totalRounds}
              </span>
            </div>

            {/* Countdown Timer */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-blue-400/30 font-mono font-extrabold text-sm sm:text-base text-amber-300">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>{timeLeftFormatted}</span>
            </div>

            <button
              type="button"
              onClick={() => setShowLeaderboardModal(true)}
              className="p-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-amber-300 cursor-pointer"
              title="ดูอันดับคะแนนทั้งหมด"
              aria-label="ดูอันดับคะแนนทั้งหมด"
            >
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Responsive Gameplay Layout:
          On Mobile: Board is ALWAYS visible at the top, followed immediately by Question & Dice controls below.
          On Desktop (lg): 12-column split with large Board on left (col-span-7) and Question + Dice on right (col-span-5). */}
      <main className="flex-1 mx-auto max-w-7xl w-full p-2.5 sm:p-5 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
          {/* TOP on Mobile / LEFT on Desktop: 10x10 Game Board + Player Strip */}
          <div className="lg:col-span-7 flex flex-col gap-3 w-full">
            <GameBoardWrapper
              players={state.players}
              currentPlayerId={state.currentPlayerId ?? activeViewerId}
              movingPlayerId={state.movingPlayerId}
              movementPath={state.movement?.path}
              mode="game"
            />

            {/* Bottom Player Avatar Strip (Matches Reference Student Screen #3) */}
            <div className="bg-[#0b1d3d]/90 border border-blue-400/25 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {state.leaderboard.slice(0, 6).map((entry) => {
                  const isViewer = entry.playerId === activeViewerId;
                  return (
                    <div
                      key={entry.playerId}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border shrink-0 ${
                        isViewer
                          ? "bg-emerald-500/20 border-emerald-400/60"
                          : "bg-slate-900/70 border-white/10"
                      }`}
                    >
                      <Avatar avatarId={entry.avatarId} size="xs" ring={isViewer} />
                      <div className="text-xs leading-tight">
                        <span className="font-display font-bold text-white block truncate max-w-[68px]">
                          {entry.name}
                        </span>
                        <span className="font-mono text-[11px] text-amber-300">
                          ช่อง {entry.position}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setShowLeaderboardModal(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/30 text-xs font-display font-bold text-blue-100 shrink-0 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>อันดับทั้งหมด</span>
              </button>
            </div>
          </div>

          {/* BELOW BOARD on Mobile / RIGHT on Desktop: Question Card + Dice Roll Panel */}
          <div className="lg:col-span-5 flex flex-col gap-4 w-full">
            {/* Active Question Card */}
            <QuestionCard
              question={state.question}
              onAnswer={handleSubmitAnswer}
              viewerAnswerState={viewerPlayer?.answerState ?? "idle"}
              viewerSelectedOptionId={viewerPlayer?.selectedOptionId}
              requireConfirmButton={true}
            />

            {/* Dice & Movement Panel (Matches Reference Student Screen #3 bottom-right) */}
            <div className="rounded-2xl bg-gradient-to-br from-[#132d5e] to-[#0c1e40] border border-blue-400/30 p-4 sm:p-5 shadow-xl">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-extrabold text-base sm:text-lg text-white">
                      ทอยลูกเต๋า
                    </span>
                    {isMyTurnToRoll ? (
                      <Badge variant="gold" size="sm">
                        ถึงคิวของคุณแล้ว!
                      </Badge>
                    ) : myQueuePosition > 0 ? (
                      <Badge variant="info" size="sm">
                        คิวที่ {myQueuePosition}
                      </Badge>
                    ) : (
                      <Badge variant="dark" size="sm">
                        {state.rollQueue.length > 0
                          ? `รอคิวผู้เล่น (${state.rollQueue.length} คน)`
                          : "ตอบถูกเพื่อรับสิทธิ์ทอย"}
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-blue-200 leading-relaxed">
                    {isMyTurnToRoll
                      ? "กดปุ่มทอยลูกเต๋าด้านล่างเพื่อเดินตัวละครของคุณบนกระดาน!"
                      : state.dice.lastReason
                      ? state.dice.lastReason
                      : "ผู้เล่นที่ตอบคำถามถูกต้องจะได้รับสิทธิ์ทอยลูกเต๋าตามลำดับความเร็ว"}
                  </p>

                  <div className="pt-2">
                    <Button
                      type="button"
                      variant={isMyTurnToRoll ? "gold" : "primary"}
                      size="md"
                      disabled={!isMyTurnToRoll || rollingAnim}
                      onClick={handleRollDice}
                      iconLeft={<Dice5 className="w-5 h-5" />}
                      className="w-full sm:w-auto"
                    >
                      {rollingAnim
                        ? "กำลังทอยลูกเต๋า..."
                        : isMyTurnToRoll
                        ? "🎲 กดทอยลูกเต๋าเดี๋ยวนี้!"
                        : state.dice.value
                        ? `ผลลูกเต๋าล่าสุด: ${state.dice.value}`
                        : "รอสิทธิ์ทอยลูกเต๋า"}
                    </Button>
                  </div>
                </div>

                {/* 3D-styled Animated Dice */}
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                  <Dice
                    value={state.dice.value}
                    rolling={rollingAnim || state.dice.rolling}
                    size="md"
                  />
                  <span className="font-mono text-xs text-blue-200">
                    รอทอย: {timeLeftFormatted}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Special Event Modal (Snake / Ladder / Star / Gift / Boost) */}
      <Modal
        isOpen={Boolean(
          state.activeSpecialEvent && !state.activeSpecialEvent.resolved,
        )}
        onClose={handleResolveSpecialEvent}
        title="เหตุการณ์พิเศษบนกระดาน!"
        theme="dark"
        size="sm"
      >
        {state.activeSpecialEvent && (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Avatar
                avatarId={state.activeSpecialEvent.avatarId}
                size="2xl"
                ring
              />
            </div>
            <div>
              <Badge
                variant={
                  state.activeSpecialEvent.kind === "snake"
                    ? "danger"
                    : state.activeSpecialEvent.kind === "ladder"
                    ? "success"
                    : "gold"
                }
                size="md"
              >
                {state.activeSpecialEvent.kind === "snake"
                  ? "🐍 งูพิษดึงลง"
                  : state.activeSpecialEvent.kind === "ladder"
                  ? "🪜 บันไดวิเศษ"
                  : "⭐ ช่องโบนัสพิเศษ"}
              </Badge>
              <h3 className="font-display font-extrabold text-xl text-white mt-2">
                {state.activeSpecialEvent.playerName}
              </h3>
              <p className="font-display font-bold text-amber-300 text-base mt-1">
                {state.activeSpecialEvent.title}
              </p>
              <p className="text-sm text-blue-100 mt-1">
                {state.activeSpecialEvent.description}
              </p>
              <p className="text-xs font-mono text-blue-200 mt-2">
                เคลื่อนที่จากช่อง {state.activeSpecialEvent.from} → ช่อง{" "}
                {state.activeSpecialEvent.to}
              </p>
            </div>
            <Button
              variant="gold"
              size="lg"
              fullWidth
              onClick={handleResolveSpecialEvent}
              iconLeft={<CheckCircle2 className="w-5 h-5" />}
            >
              รับทราบและดำเนินการต่อ
            </Button>
          </div>
        )}
      </Modal>

      {/* Game Finished / Competition Results Modal */}
      <Modal
        isOpen={state.gameStatus === "finished"}
        onClose={() => {}}
        title="🏁 จบการแข่งขัน! สรุปผลผู้พิชิตความรู้"
        description={`ห้องเรียน: ${state.game.title} (PIN: ${pin})`}
        theme="light"
        size="lg"
        showClose={false}
      >
        <div className="space-y-6">
          <Leaderboard
            entries={state.leaderboard}
            viewerPlayerId={activeViewerId}
            mode="podium"
            theme="light"
          />
          <Leaderboard
            entries={state.leaderboard}
            viewerPlayerId={activeViewerId}
            mode="full"
            theme="light"
          />
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/join">
              <Button variant="primary" size="md">
                เข้าร่วมเกมอื่น
              </Button>
            </Link>
            <Link href="/">
              <Button
                variant="secondary"
                size="md"
                iconLeft={<Home className="w-4 h-4" />}
              >
                กลับหน้าหลัก
              </Button>
            </Link>
          </div>
        </div>
      </Modal>

      {/* Live Leaderboard Modal */}
      <Modal
        isOpen={showLeaderboardModal}
        onClose={() => setShowLeaderboardModal(false)}
        title="อันดับผู้เล่นปัจจุบัน (Leaderboard)"
        theme="dark"
        size="md"
      >
        <div className="space-y-4">
          <Leaderboard
            entries={state.leaderboard}
            viewerPlayerId={activeViewerId}
            mode="full"
            theme="dark"
          />
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
