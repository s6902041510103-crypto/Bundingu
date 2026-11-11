"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTeacherAuth } from "@/lib/hooks/useTeacherAuth";
import {
  createInitialGameState,
  canTeacherAdvance,
  computePostQuestionAnalytics,
  computeNormalizedGrades,
  calculateMaxPossibleRawScore,
} from "@/lib/game-state";
import { createProductionTransport, type GameStateTransport } from "@/lib/transport";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Loading } from "@/components/ui/Loading";
import { KnowledgeSnakeLogo } from "@/components/ui/Logo";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { QRCodeSVG } from "@/components/ui/QRCode";
import { Avatar } from "@/components/game/Avatar";
import { GameBoardWrapper } from "@/components/game/GameBoard";
import { Leaderboard } from "@/components/game/Leaderboard";
import { SoundToggle } from "@/components/game/SoundToggle";
import { Modal } from "@/components/ui/Modal";
import { ConfettiCanvas } from "@/components/game/ConfettiEffect";
import type { GameState, ServerGameCommand } from "@/lib/types";
import {
  Play,
  SkipForward,
  XCircle,
  Copy,
  Monitor,
  Users,
  Clock,
  Dice5,
  Sparkles,
  Trophy,
  ArrowLeft,
  CheckCircle2,
  FileBarChart,
  QrCode,
  ArrowRight,
  Eye,
  Zap,
  AlertTriangle,
  BarChart3,
} from "lucide-react";

export default function TeacherLiveControllerPage() {
  const params = useParams<{ pin: string }>();
  const pin = String(params?.pin || "KS4829").toUpperCase();
  const { loading: authLoading } = useTeacherAuth(true);
  const { toasts, addToast, removeToast } = useToast();
  const [originUrl, setOriginUrl] = useState("http://localhost:3000");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOriginUrl(window.location.origin);
      if (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
      ) {
        fetch("/api/network")
          .then((r) => r.json())
          .then((data) => {
            if (data?.lanUrl) {
              setOriginUrl(data.lanUrl);
            }
          })
          .catch(() => {});
      }
    }
  }, []);

  const [state, setState] = useState<GameState>(() =>
    createInitialGameState({
      game: {
        id: `game-${pin}`,
        pin,
        title: "กำลังโหลดห้องเรียน...",
        subject: "คณิตศาสตร์",
        grade: "มัธยมศึกษา",
        hostName: "ครูผู้สอน",
        school: "โรงเรียนสาธิต",
      },
    }),
  );
  const [commandBusy, setCommandBusy] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(true);
  const [showEndConfirmModal, setShowEndConfirmModal] = useState(false);
  const [targetGrade, setTargetGrade] = useState<number>(10);

  // Auto open summary modal when game finishes
  useEffect(() => {
    if (state.gameStatus === "finished") {
      setShowSummaryModal(true);
    }
  }, [state.gameStatus]);
  const transportRef = useRef<GameStateTransport | null>(null);

  useEffect(() => {
    const transport = createProductionTransport(pin, state, {
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

  // Server countdown ticker while a question is active and unrevealed
  useEffect(() => {
    if (
      (state.gameStatus !== "question" && state.gameStatus !== "answering") ||
      !state.question ||
      state.question.revealed
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      transportRef.current?.sendCommand?.({ type: "TIMER_TICK" });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [state.gameStatus, state.question?.revealed, state.question?.number]);

  const sendTeacherCommand = async (cmd: ServerGameCommand) => {
    if (!transportRef.current?.sendCommand) return;
    setCommandBusy(true);
    try {
      const res = await transportRef.current.sendCommand(cmd);
      if (!res.ok && res.error) {
        addToast({
          title: "ไม่สามารถส่งคำสั่งได้",
          description: res.error,
          variant: "warning",
        });
      }
    } finally {
      setCommandBusy(false);
    }
  };

  // Fallback auto-roll on Teacher controller: if a student in rollQueue hasn't rolled within ~3.8s
  // (e.g., phone screen locked or network lag after their 3s client auto-roll), roll automatically for them.
  const firstRollerId = state.rollQueue[0] ?? null;
  const firstRollerPos = state.players.find((p) => p.id === firstRollerId)?.position ?? null;
  const activeEventId =
    state.activeSpecialEvent && !state.activeSpecialEvent.resolved
      ? state.activeSpecialEvent.id
      : null;

  useEffect(() => {
    if (!firstRollerId || activeEventId) return;
    const timer = window.setTimeout(() => {
      transportRef.current?.sendCommand?.({
        type: "ROLL_DICE",
        playerId: firstRollerId,
      });
    }, 3800);
    return () => window.clearTimeout(timer);
  }, [firstRollerId, firstRollerPos, state.round, activeEventId]);

  // Auto-resolve unresolved special events after 3.5s so auto-rolls never stall the game
  useEffect(() => {
    if (!activeEventId) return;
    const timer = window.setTimeout(() => {
      transportRef.current?.sendCommand?.({
        type: "RESOLVE_SPECIAL_EVENT",
      });
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [activeEventId]);

  const handleCopyPin = () => {
    navigator.clipboard?.writeText(pin);
    addToast({
      title: `คัดลอกคีย์ห้อง ${pin} แล้ว`,
      variant: "info",
    });
  };

  if (authLoading) {
    return <Loading fullScreen label="กำลังเปิดห้องเกมสำหรับครู..." />;
  }

  const hasUnresolvedSpecialEvent = Boolean(
    state.activeSpecialEvent && !state.activeSpecialEvent.resolved,
  );
  const isMoving = state.gameStatus === "moving";
  const hasPendingRolls =
    state.gameStatus === "dice" && state.rollQueue.length > 0;

  // Rule: Teacher can start the next question when not in special event, not moving, and rollQueue is empty
  const canStartNextQuestion =
    !hasUnresolvedSpecialEvent &&
    !isMoving &&
    !hasPendingRolls &&
    state.gameStatus !== "finished" &&
    (state.gameStatus === "lobby" ||
      state.gameStatus === "reveal" ||
      (state.gameStatus === "dice" && state.rollQueue.length === 0));

  const advanceCheck = canTeacherAdvance(state);

  const answeredCount = state.players.filter(
    (p) => p.answerState !== "idle" || p.selectedOptionId !== null,
  ).length;
  const totalPlayers = state.players.length;
  const answerProgressPercent =
    totalPlayers > 0 ? Math.round((answeredCount / totalPlayers) * 100) : 0;

  const isLobbyPhase = state.gameStatus === "lobby";
  const currentRoller =
    state.rollQueue.length > 0
      ? state.players.find((p) => p.id === state.rollQueue[0]) ?? null
      : null;

  const postQuestionAnalytics = computePostQuestionAnalytics(
    state.question,
    state.players,
  );
  const questionsPlayed = Math.max(1, state.round);
  const maxPossibleRawScore = calculateMaxPossibleRawScore({
    questionsPlayed,
    targetGrade,
  });
  const normalizedGradeRows = computeNormalizedGrades(
    state.players.map((p) => ({
      playerId: p.id,
      name: p.name,
      avatarId: p.avatarId,
      score: p.score,
      position: p.position,
      finishRank: p.finishRank,
      quizPoints: p.quizPoints,
      correctCount: p.correctCount,
    })),
    { questionsPlayed, targetGrade },
  );
  const gradeByPlayerId = new Map(
    normalizedGradeRows.map((g) => [g.playerId, g]),
  );

  return (
    <div
      className={`min-h-screen font-body flex flex-col ${
        isLobbyPhase
          ? "bg-[#e9eff8] text-slate-900"
          : "bg-arena-navy text-white"
      }`}
    >
      {/* Top Header Bar */}
      <header
        className={`sticky top-0 z-30 border-b px-4 sm:px-6 py-3 ${
          isLobbyPhase
            ? "bg-white border-slate-200 shadow-xs text-slate-900"
            : "bg-[#08152c]/95 backdrop-blur-md border-blue-400/20 text-white"
        }`}
      >
        <div className="mx-auto max-w-[1560px] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/teacher/dashboard"
              className={`p-2 rounded-xl border transition-colors ${
                isLobbyPhase
                  ? "border-slate-200 text-slate-600 hover:bg-slate-100"
                  : "border-white/15 text-blue-200 hover:bg-white/10"
              }`}
              title="กลับหน้าแดชบอร์ดครู"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <KnowledgeSnakeLogo
              size="sm"
              theme={isLobbyPhase ? "light" : "dark"}
            />
            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border ${
                isLobbyPhase
                  ? "bg-blue-50 border-blue-200 text-[#0f2547]"
                  : "bg-blue-950/90 border-blue-400/30 text-white"
              }`}
            >
              <span className="text-xs font-display font-bold text-blue-500">
                KEY:
              </span>
              <span className="font-display text-lg sm:text-xl font-black tracking-wider">
                {pin}
              </span>
              <button
                type="button"
                onClick={handleCopyPin}
                className="p-1 rounded-lg hover:bg-blue-500/20 text-blue-500 cursor-pointer"
                title="คัดลอกคีย์ห้อง"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/35 text-xs font-display font-bold text-amber-500">
              <Eye className="w-3.5 h-3.5" />
              <span>โหมดครูผู้คุมเกม (ดูบอร์ดและกดคำถามถัดไป · ไม่มีสิทธิ์ทอยเต๋า)</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Badge
              variant={
                state.gameStatus === "finished"
                  ? "default"
                  : isLobbyPhase
                  ? "warning"
                  : "success"
              }
              size="md"
              dot
            >
              {isLobbyPhase
                ? `รอนักเรียนเข้าห้อง (${totalPlayers} คน)`
                : state.gameStatus === "finished"
                ? "จบการแข่งขัน"
                : `กำลังแข่งขัน · ข้อที่ ${state.round}/${state.totalRounds}`}
            </Badge>

            {!isLobbyPhase && state.gameStatus !== "finished" && (
              <Button
                variant="destructive"
                size="sm"
                disabled={commandBusy}
                onClick={() => setShowEndConfirmModal(true)}
                iconLeft={<XCircle className="w-4 h-4" />}
              >
                จบเกมทันที
              </Button>
            )}

            <SoundToggle />
          </div>
        </div>
      </header>

      {/* =====================================================================
          STAGE 1: TEACHER WAITING LOBBY (รอนักเรียนเข้าจนครบแล้วกดเริ่มเกม)
         ===================================================================== */}
      {isLobbyPhase ? (
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6">
          <div className="grid lg:grid-cols-12 gap-6 items-stretch">
            {/* Left: Big Room Key & QR Code for Classroom Screen */}
            <Card
              variant="elevated"
              padding="lg"
              className="lg:col-span-5 flex flex-col items-center justify-between text-center bg-gradient-to-b from-blue-50/90 via-white to-white border-2 border-blue-200 space-y-5"
            >
              <div className="space-y-1.5">
                <Badge variant="primary" size="md">
                  ขั้นตอนที่ 1 · ให้นักเรียนเข้าห้อง
                </Badge>
                <h1 className="font-display text-2xl font-extrabold text-[#0f2547] pt-1">
                  {state.game.title}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  วิชา: {state.game.subject} · {state.totalRounds} รอบ · เวลาตอบ{" "}
                  {state.settings.questionTimeLimit} วินาที/ข้อ
                </p>
              </div>

              <div className="w-full p-5 rounded-3xl bg-[#0f2547] text-white shadow-lg space-y-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-display font-bold text-amber-300 uppercase tracking-wider">
                  <QrCode className="w-4 h-4" />
                  <span>คีย์เข้าห้องเกม (Room Key)</span>
                </div>
                <div className="font-display text-5xl sm:text-6xl font-black tracking-[0.18em] text-white">
                  {pin}
                </div>
                <button
                  type="button"
                  onClick={handleCopyPin}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-display font-semibold text-blue-100 cursor-pointer transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>คัดลอกคีย์ {pin}</span>
                </button>
              </div>

              <div className="flex flex-col items-center gap-2">
                <QRCodeSVG
                  value={`${originUrl}/join?pin=${pin}`}
                  size={168}
                  label={`SCAN JOIN: ${pin}`}
                />
                <p className="text-xs text-slate-500">
                  นักเรียนเข้าผ่าน <strong>{originUrl}/join</strong> หรือสแกน QR Code
                </p>
              </div>
            </Card>

            {/* Right: Live Students Waiting List + BIG "Start Game" Button */}
            <Card
              variant="elevated"
              padding="lg"
              className="lg:col-span-7 flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="font-display text-xl font-extrabold text-[#0f2547] flex items-center gap-2">
                      <Users className="w-6 h-6 text-blue-600" />
                      <span>นักเรียนที่เข้ามาในห้องแล้ว ({totalPlayers} คน)</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                      รายชื่อจะเด้งขึ้นอัตโนมัติแบบ Realtime เมื่อครบตามที่ครูต้องการแล้ว กดปุ่ม &ldquo;เริ่มเกม&rdquo; ด้านล่างได้เลย
                    </p>
                  </div>

                  <Badge variant={totalPlayers > 0 ? "success" : "warning"} size="lg" dot>
                    {totalPlayers > 0
                      ? `พร้อมแล้ว ${totalPlayers} คน`
                      : "รอนักเรียนคนแรกเข้าห้อง..."}
                  </Badge>
                </div>

                {totalPlayers === 0 ? (
                  <div className="py-16 px-6 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/60 text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto animate-pulse">
                      <Users className="w-7 h-7" />
                    </div>
                    <p className="font-display font-bold text-base text-slate-700">
                      กำลังรอนักเรียนกรอกคีย์ <span className="text-blue-700 font-mono">{pin}</span> เพื่อเข้าห้อง...
                    </p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      เมื่อนักเรียนเข้าห้องมาแล้ว ชื่อและตัวละครของนักเรียนจะปรากฏที่นี่ทันที
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
                    {state.players.map((p, idx) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-2xs"
                      >
                        <Avatar avatarId={p.avatarId} size="md" ring />
                        <div className="min-w-0">
                          <p className="font-display font-bold text-sm text-slate-900 truncate">
                            {p.name}
                          </p>
                          <span className="text-[11px] font-semibold text-emerald-700">
                            #{idx + 1} · พร้อมเล่น
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Start Game Action Area */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <button
                  type="button"
                  disabled={totalPlayers === 0 || commandBusy}
                  onClick={() => sendTeacherCommand({ type: "START_GAME" })}
                  className="w-full py-5 px-6 rounded-2xl font-display font-extrabold text-xl text-white bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-lg shadow-emerald-600/25 disabled:opacity-45 disabled:pointer-events-none cursor-pointer transition-all flex items-center justify-center gap-3"
                >
                  <Play className="w-7 h-7 fill-current" />
                  <span>
                    {totalPlayers === 0
                      ? "รอนักเรียนเข้าห้องอย่างน้อย 1 คนเพื่อเริ่มเกม"
                      : `นักเรียนครบแล้ว (${totalPlayers} คน) — กดเริ่มเกมและเข้าสู่กระดานทันที!`}
                  </span>
                </button>
                <p className="text-center text-xs text-slate-500">
                  เมื่อกดเริ่มเกม หน้าจอของครูและนักเรียนทุกคนจะเข้าสู่หน้ากระดานเกม 100 ช่องพร้อมคำถามข้อที่ 1 ทันที
                </p>
              </div>
            </Card>
          </div>
        </main>
      ) : (
        /* =====================================================================
            STAGE 2: TEACHER IN-GAME BOARD & HOST VIEW
            (ครูอยู่หน้ากระดานเกมเหมือนนักเรียน ดูบอร์ดสด ไม่มีสิทธิ์ทอยเต๋า แต่คอยกดคำถามถัดไป)
           ===================================================================== */
        <main className="flex-1 p-3 sm:p-5 max-w-[1560px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT / CENTER (7 cols): Live 10x10 Snake & Ladder Board */}
          <div className="lg:col-span-7 flex flex-col items-center space-y-3 w-full">
            {/* Live Event Banner above Board */}
            <div className="w-full max-w-[680px] px-4 py-2.5 rounded-2xl bg-[#112448]/95 border border-blue-400/25 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Dice5 className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="font-display font-bold text-xs sm:text-sm text-blue-100 truncate">
                  {state.lastEvent || "กำลังดำเนินการแข่งขัน"}
                </span>
              </div>
              {state.dice.value && (
                <Badge variant="gold" size="sm">
                  เต๋าล่าสุด: {state.dice.value} แต้ม
                </Badge>
              )}
            </div>

            <div className="w-full max-w-[680px]">
              <GameBoardWrapper
                players={state.players}
                currentPlayerId={state.currentPlayerId}
                movingPlayerId={state.movingPlayerId}
                mode="game"
              />
            </div>
          </div>

          {/* RIGHT (5 cols): Teacher Host Control Panel (No personal dice roll / no student answer buttons) */}
          <div className="lg:col-span-5 flex flex-col gap-4 w-full">
            {/* 1. Primary Teacher Action Box (Next Question / Reveal / Special Event) */}
            <div className="rounded-3xl bg-[#112448]/95 border-2 border-blue-400/30 p-5 shadow-board space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="gold" size="sm">
                    แผงควบคุมครูผู้สอน
                  </Badge>
                  <span className="text-xs text-blue-200/80">
                    รอบที่ {state.round}/{state.totalRounds}
                  </span>
                </div>
                <span className="text-xs font-display font-semibold text-emerald-300">
                  ตอบแล้ว {answeredCount}/{totalPlayers} คน
                </span>
              </div>

              {/* Special Event Banner if active */}
              {hasUnresolvedSpecialEvent && state.activeSpecialEvent && (
                <div className="p-4 rounded-2xl bg-amber-500/20 border-2 border-amber-400 text-amber-100 space-y-3">
                  <div className="flex items-center gap-2 font-display font-bold text-base text-amber-300">
                    <Sparkles className="w-5 h-5" />
                    <span>
                      {state.activeSpecialEvent.playerName}:{" "}
                      {state.activeSpecialEvent.title}
                    </span>
                  </div>
                  <p className="text-xs text-amber-100/90">
                    {state.activeSpecialEvent.description} (ช่อง{" "}
                    {state.activeSpecialEvent.from} → {state.activeSpecialEvent.to})
                  </p>
                  <Button
                    variant="gold"
                    size="md"
                    fullWidth
                    disabled={commandBusy}
                    onClick={() =>
                      sendTeacherCommand({ type: "RESOLVE_SPECIAL_EVENT" })
                    }
                    iconLeft={<CheckCircle2 className="w-4 h-4" />}
                  >
                    ยืนยันจบเหตุการณ์พิเศษ
                  </Button>
                </div>
              )}

              {/* Big Next Question Button (or status while students are answering/rolling) */}
              {state.gameStatus === "finished" ? (
                <div className="p-5 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-center space-y-3">
                  <Trophy className="w-10 h-10 text-amber-400 mx-auto" />
                  <h3 className="font-display text-xl font-extrabold text-white">
                    การแข่งขันรอบนี้สิ้นสุดลงแล้ว!
                  </h3>
                  <p className="text-xs text-blue-100/90">
                    ห้องเกมนี้ถูกบันทึกไว้แล้ว คุณสามารถกดรีเซ็ตเพื่อเปิดรับนักเรียนห้องถัดไปในห้องเดิมได้ทันที
                  </p>
                  <div className="flex flex-wrap justify-center gap-2.5 pt-1">
                    <Button
                      variant="gold"
                      size="md"
                      disabled={commandBusy}
                      onClick={() => sendTeacherCommand({ type: "RESET_ROOM" })}
                    >
                      🔄 เปิดใช้ห้องนี้อีกครั้ง (รอนักเรียนกลุ่มใหม่)
                    </Button>
                    <Link href="/teacher/dashboard">
                      <Button variant="secondary" size="md">
                        กลับหน้าห้องเกมที่สร้างไว้
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : canStartNextQuestion ? (
                <button
                  type="button"
                  disabled={commandBusy}
                  onClick={() => sendTeacherCommand({ type: "START_QUESTION" })}
                  className="w-full py-4 px-6 rounded-2xl font-display font-extrabold text-lg sm:text-xl text-slate-950 bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 hover:from-amber-200 hover:to-orange-300 shadow-lg shadow-amber-500/25 cursor-pointer transition-all flex items-center justify-center gap-2.5"
                >
                  <span>
                    {state.round >= state.totalRounds
                      ? "🏆 สรุปผลและจบการแข่งขัน"
                      : `➡️ ไปคำถามข้อถัดไป (ข้อที่ ${state.round + 1}/${state.totalRounds})`}
                  </span>
                  <ArrowRight className="w-6 h-6" />
                </button>
              ) : state.question && !state.question.revealed ? (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-blue-950/80 border border-blue-400/25 flex items-center justify-between">
                    <div>
                      <p className="font-display font-bold text-sm text-white">
                        กำลังให้นักเรียนเลือกคำตอบ...
                      </p>
                      <p className="text-xs text-blue-200/80">
                        เมื่อนักเรียนตอบครบทุกคน ระบบจะเฉลยให้อัตโนมัติ
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={commandBusy}
                      onClick={() =>
                        sendTeacherCommand({ type: "REVEAL_ANSWERS" })
                      }
                    >
                      เฉลยทันที
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-blue-950/80 border border-blue-400/25 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display font-bold text-sm text-amber-300">
                      {currentRoller
                        ? `🎲 รอนักเรียน "${currentRoller.name}" กดทอยลูกเต๋า...`
                        : "กำลังเดินหมากบนกระดาน..."}
                    </p>
                    <p className="text-xs text-blue-200/75 mt-0.5">
                      เหลือคิวทอยลูกเต๋าอีก {state.rollQueue.length} คน (เมื่อทอยครบแล้วปุ่มคำถามถัดไปจะเปิดให้กด)
                    </p>
                  </div>
                  {currentRoller && !hasUnresolvedSpecialEvent && (
                    <Button
                      variant="gold"
                      size="sm"
                      disabled={commandBusy}
                      onClick={() =>
                        sendTeacherCommand({
                          type: "ROLL_DICE",
                          playerId: currentRoller.id,
                        })
                      }
                      iconLeft={<SkipForward className="w-4 h-4" />}
                    >
                      ทอยให้ {currentRoller.name}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* 2. Current Question Display for Teacher (Read-only observer view) */}
            {state.question && (
              <div className="rounded-3xl bg-[#112448]/95 border border-blue-400/25 p-5 shadow-board space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="primary" size="sm">
                    คำถามข้อที่ {state.question.number}/{state.totalRounds} ·{" "}
                    {state.question.subject}
                  </Badge>
                  <div className="inline-flex items-center gap-1.5 font-mono font-bold text-sm text-amber-300">
                    <Clock className="w-4 h-4" />
                    <span>
                      {state.question.revealed
                        ? "เฉลยแล้ว"
                        : `${state.question.timeLeft} วินาที`}
                    </span>
                  </div>
                </div>

                <h2 className="font-display text-base sm:text-lg font-extrabold text-white leading-snug">
                  {state.question.prompt}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {state.question.options.map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    const isCorrect =
                      state.question?.revealed &&
                      state.question.correctOptionId === opt.id;
                    return (
                      <div
                        key={opt.id}
                        className={`px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-display font-semibold flex items-center gap-2.5 ${
                          isCorrect
                            ? "bg-emerald-500/25 border-emerald-400 text-emerald-200"
                            : "bg-slate-900/70 border-white/10 text-blue-100"
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            isCorrect
                              ? "bg-emerald-400 text-slate-950"
                              : "bg-white/10 text-white"
                          }`}
                        >
                          {letter}
                        </span>
                        <span className="truncate">{opt.text}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Module 2: Post-Question State — A/B/C/D Vote Distribution Bar Chart & Fastest Player */}
                {state.question.revealed && postQuestionAnalytics && (
                  <div className="pt-3 border-t border-white/15 space-y-3">
                    {/* Fastest Player Highlight */}
                    <div className="rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 border border-amber-400/40 p-3 flex items-center justify-between gap-3">
                      {postQuestionAnalytics.fastestPlayer ? (
                        <>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                              <Zap className="w-4 h-4 fill-current" />
                            </div>
                            <Avatar
                              avatarId={postQuestionAnalytics.fastestPlayer.avatarId}
                              size="xs"
                            />
                            <div className="min-w-0">
                              <p className="text-[11px] font-display font-bold uppercase tracking-wider text-amber-300">
                                ⚡ ตอบถูกเร็วที่สุด (Fastest Player)
                              </p>
                              <p className="font-display font-extrabold text-sm text-white truncate">
                                {postQuestionAnalytics.fastestPlayer.playerName}
                              </p>
                            </div>
                          </div>
                          <Badge variant="gold" size="sm">
                            {(
                              postQuestionAnalytics.fastestPlayer.responseTimeMs /
                              1000
                            ).toFixed(2)}
                            s · +
                            {postQuestionAnalytics.fastestPlayer.speedBonus.toFixed(
                              2,
                            )}{" "}
                            Speed Pts
                          </Badge>
                        </>
                      ) : (
                        <p className="text-xs font-display font-semibold text-amber-200">
                          ไม่มีผู้ตอบถูกในข้อนี้ · นักเรียนทุกคนเดินหน้าอัตโนมัติ 1 ช่อง
                        </p>
                      )}
                    </div>

                    {/* A, B, C, D Vote Distribution Bar Chart */}
                    <div className="rounded-2xl bg-slate-900/75 border border-white/10 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-display font-bold text-blue-200 flex items-center gap-1.5">
                          <BarChart3 className="w-4 h-4 text-amber-400" />
                          <span>สัดส่วนการเลือกคำตอบ A, B, C, D</span>
                        </span>
                        <span className="text-blue-300/80 font-mono">
                          ตอบแล้ว {postQuestionAnalytics.totalResponses} คน
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-2.5 pt-1">
                        {postQuestionAnalytics.distribution.map((item) => (
                          <div
                            key={item.optionId}
                            className="flex flex-col items-center"
                          >
                            <div className="mb-1 text-center font-mono text-[11px]">
                              <span className="font-bold text-white">
                                {item.count}
                              </span>
                              <span className="text-blue-300/80 ml-0.5">
                                ({item.percentage}%)
                              </span>
                            </div>

                            <div className="relative flex h-24 w-full max-w-[48px] items-end justify-center overflow-hidden rounded-t-xl bg-slate-800/90 p-1 border border-white/5">
                              <div
                                style={{
                                  height: `${Math.max(
                                    item.percentage,
                                    item.count > 0 ? 10 : 0,
                                  )}%`,
                                }}
                                className={`w-full rounded-t-lg transition-all duration-500 ${
                                  item.isCorrect
                                    ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.45)]"
                                    : "bg-blue-400/80"
                                }`}
                              />
                            </div>

                            <div
                              className={`mt-1.5 flex w-full items-center justify-center gap-1 rounded-lg px-1.5 py-1 text-xs font-display font-bold ${
                                item.isCorrect
                                  ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400/50"
                                  : "bg-white/10 text-blue-100"
                              }`}
                            >
                              <span>{item.optionId}</span>
                              {item.isCorrect && (
                                <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. Live Student Status & Leaderboard */}
            <div className="rounded-3xl bg-[#112448]/95 border border-blue-400/25 p-5 shadow-board space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>ตำแหน่งและสถานะนักเรียน ({state.players.length} คน)</span>
                </h3>
                <span className="text-xs text-blue-200/70">
                  คลิกดูบนกระดานได้แบบสด ๆ
                </span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {state.leaderboard.map((entry) => {
                  const p = state.players.find((pl) => pl.id === entry.playerId);
                  const isInQueue = state.rollQueue.includes(entry.playerId);
                  const isFirstInQueue = state.rollQueue[0] === entry.playerId;

                  return (
                    <div
                      key={entry.playerId}
                      className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border ${
                        isFirstInQueue
                          ? "bg-amber-500/20 border-amber-400"
                          : "bg-slate-900/60 border-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 text-center font-display font-bold text-xs text-blue-200">
                          #{entry.rank}
                        </span>
                        <Avatar avatarId={entry.avatarId} size="xs" />
                        <div className="min-w-0">
                          <p className="font-display font-bold text-xs sm:text-sm text-white truncate">
                            {entry.name}
                          </p>
                          <p className="text-[11px] text-blue-200/75 flex items-center gap-1.5 flex-wrap">
                            <span>ช่องที่ {entry.position} · {entry.score} คะแนน</span>
                            <span className="text-emerald-400 font-mono font-bold">✓{p?.correctCount ?? entry.correctCount ?? 0}</span>
                            <span className="text-rose-400 font-mono font-bold">✗{p?.wrongCount ?? entry.wrongCount ?? 0}</span>
                            {(entry.shield || p?.shield) && <span title="มีโล่ป้องกันงู">🛡️</span>}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isInQueue && (
                          <Badge variant="gold" size="sm">
                            {isFirstInQueue ? "🎲 ถึงคิวทอย" : "รอทอย"}
                          </Badge>
                        )}
                        {p && (
                          <Badge
                            variant={
                              p.answerState === "correct"
                                ? "success"
                                : p.answerState === "wrong"
                                ? "danger"
                                : p.answerState === "selected" || p.selectedOptionId
                                ? "primary"
                                : "default"
                            }
                            size="sm"
                          >
                            {p.answerState === "correct"
                              ? "ตอบถูก ✓"
                              : p.answerState === "wrong"
                              ? "ตอบผิด ✗"
                              : p.answerState === "selected" || p.selectedOptionId
                              ? "ตอบแล้ว"
                              : "รอตอบ"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      )}

            {/* Game Finished / Results Celebration Modal for Teacher (หน้าสรุปผลขึ้นเหมือนเด็ก) */}
      <Modal
        isOpen={state.gameStatus === "finished" && showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        title="🏁 จบการแข่งขัน! สรุปผลผู้พิชิตความรู้"
        description={`ห้องเรียน: ${state.game.title} (PIN: ${pin}) · วิชา ${state.game.subject}`}
        theme="light"
        size="xl"
        showClose={true}
      >
        <div className="space-y-6">
          <ConfettiCanvas
            active={state.gameStatus === "finished" && showSummaryModal}
            count={120}
            durationMs={4500}
          />

          {/* Podium Top 3 */}
          <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-b from-amber-50/90 via-blue-50/60 to-white border border-amber-200/90 shadow-sm text-center">
            <h3 className="font-display font-extrabold text-lg sm:text-xl text-slate-850 mb-1">
              🏆 โพเดียมผู้ชนะสูงสุด (Top 3)
            </h3>
            <p className="text-xs text-slate-500 mb-2">
              ยินดีด้วยกับนักเรียนที่มีคะแนนรวมและอันดับสูงสุดในการแข่งขัน!
            </p>
            <Leaderboard
              entries={state.leaderboard}
              mode="podium"
              theme="light"
            />
          </div>

          {/* Full Leaderboard Table + Dynamic Normalized Grade */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3">
              <div>
                <h4 className="font-display font-bold text-sm text-slate-800">
                  📐 คำนวณคะแนนเก็บสุทธิ (Dynamic Grade Normalization)
                </h4>
                <p className="text-xs text-slate-500">
                  คิดจากจำนวนข้อที่เล่นจริง ({questionsPlayed} ข้อ) · คะแนนดิบสูงสุดที่เป็นไปได้ ={" "}
                  <strong className="font-mono text-blue-700">
                    {maxPossibleRawScore}
                  </strong>{" "}
                  คะแนน
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="target-grade-input"
                  className="text-xs font-display font-bold text-slate-700"
                >
                  คะแนนเต็ม (Target Grade):
                </label>
                <input
                  id="target-grade-input"
                  type="number"
                  min={1}
                  max={100}
                  value={targetGrade}
                  onChange={(e) =>
                    setTargetGrade(Math.max(1, Number(e.target.value) || 10))
                  }
                  className="w-20 px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-sm text-slate-900 text-center"
                />
              </div>
            </div>

            <div className="max-h-[340px] overflow-y-auto pr-1 space-y-2">
              <Leaderboard
                entries={state.leaderboard}
                mode="full"
                theme="light"
              />
              {normalizedGradeRows.length > 0 && (
                <div className="rounded-2xl border border-slate-200 overflow-hidden mt-3">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 font-display font-bold text-slate-600">
                        <th className="py-2 px-3">ชื่อนักเรียน</th>
                        <th className="py-2 px-3 text-right">คะแนนคำถาม</th>
                        <th className="py-2 px-3 text-right">ตำแหน่งช่อง</th>
                        <th className="py-2 px-3 text-right">โบนัสเส้นชัย</th>
                        <th className="py-2 px-3 text-right">คะแนนดิบรวม</th>
                        <th className="py-2 px-3 text-right text-blue-700">
                          เกรดสุทธิ (/{targetGrade})
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {state.leaderboard.map((entry) => {
                        const g = gradeByPlayerId.get(entry.playerId);
                        if (!g) return null;
                        return (
                          <tr key={entry.playerId} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-display font-bold text-slate-800">
                              #{entry.rank} {g.playerName}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700">
                              {g.quizScore.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700">
                              {g.boardPositionScore}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-emerald-600 font-bold">
                              +{g.finishBonus}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                              {g.rawScore.toFixed(2)} / {g.maxPossibleRawScore}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-extrabold text-sm text-blue-700">
                              {g.normalizedGrade.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowSummaryModal(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline cursor-pointer"
            >
              👀 ซ่อนหน้าต่างเพื่อดูตำแหน่งบนกระดานเกม
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="gold"
                size="md"
                disabled={commandBusy}
                onClick={() => sendTeacherCommand({ type: "RESET_ROOM" })}
              >
                🔄 เปิดใช้ห้องนี้อีกครั้ง (รอนักเรียนกลุ่มใหม่)
              </Button>
              <Link href="/teacher/dashboard">
                <Button variant="secondary" size="md">
                  กลับหน้าแดชบอร์ด
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Modal>

      {/* Module 2: Force End Game Confirmation Modal */}
      <Modal
        isOpen={showEndConfirmModal}
        onClose={() => setShowEndConfirmModal(false)}
        title="ยืนยันการจบเกมทันที (Force End Game)"
        description="คุณต้องการยุติการแข่งขันและสรุปคะแนนของนักเรียนทุกคนจากจำนวนข้อที่เล่นไปแล้วใช่หรือไม่?"
        theme="light"
        size="md"
        showClose={true}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              ระบบจะหยุดเกมทันทีและคำนวณเกรดสุทธิ (Normalized Grade) โดยอ้างอิงจากจำนวนข้อที่เล่นจริง ({questionsPlayed} ข้อ) เท่านั้น นักเรียนจะไม่เสียเปรียบจากข้อที่ยังไม่ได้เล่น
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              variant="secondary"
              size="md"
              disabled={commandBusy}
              onClick={() => setShowEndConfirmModal(false)}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              size="md"
              disabled={commandBusy}
              onClick={async () => {
                setShowEndConfirmModal(false);
                await sendTeacherCommand({ type: "END_GAME" });
              }}
              iconLeft={<XCircle className="w-4 h-4" />}
            >
              ยืนยันจบเกมทันที
            </Button>
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
