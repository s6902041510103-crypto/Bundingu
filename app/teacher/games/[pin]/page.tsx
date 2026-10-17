"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTeacherAuth } from "@/lib/hooks/useTeacherAuth";
import { createInitialGameState, canTeacherAdvance } from "@/lib/game-state";
import { createProductionTransport, type GameStateTransport } from "@/lib/transport";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Loading } from "@/components/ui/Loading";
import { KnowledgeSnakeLogo } from "@/components/ui/Logo";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { QRCodeSVG } from "@/components/ui/QRCode";
import { Avatar } from "@/components/game/Avatar";
import { Leaderboard } from "@/components/game/Leaderboard";
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
  AlertTriangle,
  FileBarChart,
  QrCode,
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

  const handleCopyPin = () => {
    navigator.clipboard?.writeText(pin);
    addToast({
      title: `คัดลอก Game PIN ${pin} แล้ว`,
      variant: "info",
    });
  };

  if (authLoading) {
    return <Loading fullScreen label="กำลังเปิดแผงควบคุมเกมสด..." />;
  }

  const hasUnresolvedSpecialEvent = Boolean(
    state.activeSpecialEvent && !state.activeSpecialEvent.resolved,
  );
  const isMoving = state.gameStatus === "moving";
  const hasPendingRolls =
    state.gameStatus === "dice" && state.rollQueue.length > 0;

  // Rule: Teacher MUST NOT start a new question while Special Event is unresolved or players are still rolling/moving
  const canStartQuestion =
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

  return (
    <div className="min-h-screen bg-[#e9eff8] text-slate-900 font-body flex flex-col">
      {/* Top Bar (Matches Reference Screen #6) */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs px-4 sm:px-8 py-3.5">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link
              href="/teacher/dashboard"
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              title="กลับหน้าแดชบอร์ด"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <KnowledgeSnakeLogo size="sm" theme="light" />
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-2xl">
              <span className="text-xs font-display font-bold text-blue-700">
                PIN:
              </span>
              <span className="font-display text-xl sm:text-2xl font-black text-[#0f2547] tracking-wider">
                {pin}
              </span>
              <button
                type="button"
                onClick={handleCopyPin}
                className="p-1 rounded-lg hover:bg-blue-100 text-blue-700 cursor-pointer"
                title="คัดลอก PIN"
                aria-label="คัดลอก PIN"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Badge
              variant={
                state.gameStatus === "finished"
                  ? "default"
                  : state.gameStatus === "lobby"
                  ? "warning"
                  : "success"
              }
              size="md"
              dot
            >
              {state.gameStatus === "lobby"
                ? "รอเริ่มเกม"
                : state.gameStatus === "finished"
                ? "จบเกมแล้ว"
                : "กำลังเล่น"}
            </Badge>

            <div className="px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 font-display font-bold text-sm text-slate-800">
              รอบที่ {state.round}/{state.totalRounds}
            </div>

            <Link
              href={`/game/${pin}/projector`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="secondary"
                size="sm"
                iconLeft={<Monitor className="w-4 h-4 text-blue-600" />}
              >
                เปิด Projector View
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Controller Body */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Big 3 Control Buttons Row (Matches Reference Screen #6) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            disabled={!canStartQuestion || commandBusy}
            onClick={() =>
              sendTeacherCommand(
                state.gameStatus === "lobby"
                  ? { type: "START_GAME" }
                  : { type: "START_QUESTION" },
              )
            }
            className="flex items-center justify-center gap-3 py-5 px-6 rounded-2xl font-display font-extrabold text-lg sm:text-xl text-white bg-gradient-to-b from-[#2573ff] to-[#1554d1] hover:from-[#3680ff] hover:to-[#1b5de0] shadow-lg shadow-blue-600/25 disabled:opacity-45 disabled:pointer-events-none cursor-pointer transition-all"
          >
            <Play className="w-6 h-6 fill-current" />
            <span>
              {state.gameStatus === "lobby"
                ? "เริ่มคำถามข้อแรก"
                : "เริ่มคำถามข้อถัดไป"}
            </span>
          </button>

          <button
            type="button"
            disabled={!advanceCheck.allowed || commandBusy}
            onClick={() => sendTeacherCommand({ type: "ADVANCE_TURN" })}
            title={advanceCheck.reason || advanceCheck.label}
            className="flex flex-col items-center justify-center py-4 px-6 rounded-2xl font-display font-extrabold text-lg sm:text-xl bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-500/20 disabled:bg-none disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:pointer-events-none cursor-pointer transition-all"
          >
            <div className="flex items-center gap-2">
              <SkipForward className="w-6 h-6" />
              <span>ไปต่อ ({advanceCheck.label})</span>
            </div>
            {advanceCheck.reason && (
              <span className="text-[11px] font-normal opacity-80 mt-0.5">
                {advanceCheck.reason}
              </span>
            )}
          </button>

          <button
            type="button"
            disabled={state.gameStatus === "finished" || commandBusy}
            onClick={() => sendTeacherCommand({ type: "END_GAME" })}
            className="flex items-center justify-center gap-3 py-5 px-6 rounded-2xl font-display font-extrabold text-lg sm:text-xl text-white bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 shadow-lg shadow-red-600/25 disabled:opacity-45 disabled:pointer-events-none cursor-pointer transition-all"
          >
            <XCircle className="w-6 h-6" />
            <span>สิ้นสุดเกม</span>
          </button>
        </div>

        {/* Active Special Event / Snake / Ladder Alert Banner */}
        {state.activeSpecialEvent && !state.activeSpecialEvent.resolved && (
          <div
            role="alert"
            className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-400 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-bounce-in"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center text-2xl shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="gold" size="sm">
                    Special Event กำลังทำงาน
                  </Badge>
                  <span className="text-xs font-semibold text-amber-800">
                    (ระบบล็อกปุ่มเริ่มคำถามใหม่จนกว่าเหตุการณ์พิเศษจะเสร็จสิ้น)
                  </span>
                </div>
                <h3 className="font-display font-extrabold text-lg text-slate-900 mt-1">
                  {state.activeSpecialEvent.playerName}: {state.activeSpecialEvent.title}
                </h3>
                <p className="text-sm text-slate-700">
                  {state.activeSpecialEvent.description} (ช่อง {state.activeSpecialEvent.from} →{" "}
                  {state.activeSpecialEvent.to})
                </p>
              </div>
            </div>
            <Button
              variant="gold"
              size="md"
              onClick={() => sendTeacherCommand({ type: "RESOLVE_SPECIAL_EVENT" })}
              iconLeft={<CheckCircle2 className="w-4 h-4" />}
            >
              ยืนยันจบเหตุการณ์พิเศษ
            </Button>
          </div>
        )}

        {/* Main 3-Column Live Control Grid (Matches Reference Screen #6) */}
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* Left & Center: Players Count, Current Question, Countdown, and Answer Progress */}
          <div className="lg:col-span-7 space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Players Status Box */}
              <Card variant="default" padding="md" className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-display font-semibold text-slate-500">
                    ผู้เล่นในห้อง (Realtime)
                  </span>
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div className="font-display text-4xl font-black text-[#0f2547]">
                  {totalPlayers}/{state.settings.maxPlayers}
                </div>
                <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span>สถานะห้อง:</span>
                  <span className="font-display font-bold text-emerald-700">
                    {state.gameStatus === "lobby"
                      ? "รอครูเริ่มคำถาม"
                      : state.gameStatus === "question" ||
                        state.gameStatus === "answering"
                      ? "กำลังเปิดรับคำตอบ"
                      : state.gameStatus === "dice"
                      ? "ช่วงทอยลูกเต๋า"
                      : state.gameStatus === "special_event"
                      ? "กำลังแสดงเหตุการณ์พิเศษ"
                      : state.gameStatus === "finished"
                      ? "จบการแข่งขัน"
                      : "เฉลยคำตอบแล้ว"}
                  </span>
                </div>
              </Card>

              {/* Current Question & Countdown Box */}
              <Card variant="default" padding="md" className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-display font-semibold text-slate-500">
                    คำถามปัจจุบัน
                  </span>
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                {state.question ? (
                  <>
                    <div className="font-display font-bold text-base text-[#0f2547] line-clamp-2">
                      ข้อที่ {state.question.number} — {state.question.subject}:{" "}
                      {state.question.prompt}
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="text-xs text-slate-500">เวลาตอบ (Countdown):</span>
                      <span
                        className={`font-mono font-extrabold text-lg ${
                          state.question.timeLeft <= 5 && !state.question.revealed
                            ? "text-red-600 animate-pulse"
                            : "text-blue-700"
                        }`}
                      >
                        {state.question.revealed
                          ? "เฉลยแล้ว"
                          : `${state.question.timeLeft}/${state.question.timeLimit} วินาที`}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="py-3 text-sm text-slate-500">
                    ยังไม่ได้เปิดคำถาม กดปุ่ม &ldquo;เริ่มคำถาม&rdquo; ด้านบนเพื่อเริ่มรอบ
                  </div>
                )}
              </Card>
            </div>

            {/* Answer Progress Bar & Latest Walk/Dice Result */}
            <Card variant="default" padding="md" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-base text-[#0f2547]">
                    การตอบคำถามของผู้เล่น
                  </h3>
                  <p className="text-xs text-slate-500">
                    ตอบแล้ว {answeredCount}/{totalPlayers} คน ({answerProgressPercent}%)
                  </p>
                </div>
                {state.question && !state.question.revealed && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => sendTeacherCommand({ type: "REVEAL_ANSWERS" })}
                  >
                    เฉลยคำตอบทันที
                  </Button>
                )}
              </div>

              <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-gradient-to-r from-[#2573ff] to-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${answerProgressPercent}%` }}
                />
              </div>

              {/* Latest Dice / Walk / Snake / Ladder Event Log */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Dice5 className="w-5 h-5 text-blue-600 shrink-0" />
                  <span className="font-medium text-slate-800 truncate">
                    {state.lastEvent || "พร้อมดำเนินการ"}
                  </span>
                </div>
                {state.dice.value && (
                  <Badge variant="primary" size="sm">
                    ลูกเต๋าล่าสุด: {state.dice.value}
                  </Badge>
                )}
              </div>
            </Card>

            {/* Real-time Players Status List */}
            <Card variant="default" padding="md" className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-base text-[#0f2547]">
                  รายชื่อผู้เล่นและสถานะการตอบ ({state.players.length} คน)
                </h3>
                <span className="text-xs text-slate-500">ซิงก์ข้อมูลแบบ Realtime</span>
              </div>

              <div className="grid sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {state.players.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/70"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar avatarId={p.avatarId} size="sm" />
                      <div className="min-w-0">
                        <p className="font-display font-bold text-sm text-slate-900 truncate">
                          {p.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          ช่องที่ {p.position} · คะแนน {p.score}
                        </p>
                      </div>
                    </div>
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
                        ? "ส่งคำตอบแล้ว"
                        : "รอตอบ"}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Column: Room Key + QR Code, Roll Queue & Live Leaderboard */}
          <div className="lg:col-span-5 space-y-6">
            {/* Room Key & QR Code Card */}
            <Card
              variant="default"
              padding="md"
              className="bg-gradient-to-br from-blue-50/90 to-white border-blue-200"
            >
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-2 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 text-xs font-display font-bold text-blue-700 uppercase">
                    <QrCode className="w-4 h-4" />
                    <span>คีย์ห้องเกม & QR Code เข้าร่วม</span>
                  </div>
                  <div className="font-display text-3xl sm:text-4xl font-black text-[#0f2547] tracking-[0.18em]">
                    {pin}
                  </div>
                  <p className="text-xs text-slate-600">
                    ให้นักเรียนกรอกคีย์ <strong>{pin}</strong> หรือสแกน QR Code
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleCopyPin}
                    iconLeft={<Copy className="w-3.5 h-3.5" />}
                  >
                    คัดลอกคีย์ {pin}
                  </Button>
                </div>

                <div className="shrink-0">
                  <QRCodeSVG
                    value={`${originUrl}/join?pin=${pin}`}
                    size={112}
                    label={`KEY: ${pin}`}
                  />
                </div>
              </div>
            </Card>

            {/* Roll Queue Card */}
            <Card variant="default" padding="md" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-base text-[#0f2547]">
                    คิวทอยลูกเต๋า (Roll Queue)
                  </h3>
                  <p className="text-xs text-slate-500">
                    ผู้เล่นที่ตอบถูกเรียงตามความเร็ว ({state.rollQueue.length} คิว)
                  </p>
                </div>
                {state.rollQueue.length > 0 && !hasUnresolvedSpecialEvent && (
                  <Button
                    variant="gold"
                    size="sm"
                    disabled={commandBusy}
                    onClick={() =>
                      sendTeacherCommand({
                        type: "ROLL_DICE",
                        playerId: state.rollQueue[0],
                      })
                    }
                    iconLeft={<Dice5 className="w-4 h-4" />}
                  >
                    ทอยให้คิวแรก
                  </Button>
                )}
              </div>

              {state.rollQueue.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-center text-sm text-slate-500">
                  {state.question && !state.question.revealed
                    ? "รอเฉลยคำตอบเพื่อจัดลำดับคิวทอยลูกเต๋า"
                    : "ไม่มีคิวทอยลูกเต๋าที่ค้างอยู่"}
                </div>
              ) : (
                <div className="space-y-2">
                  {state.rollQueue.map((playerId, idx) => {
                    const p = state.players.find((pl) => pl.id === playerId);
                    if (!p) return null;
                    const isFirst = idx === 0;
                    return (
                      <div
                        key={playerId}
                        className={`flex items-center justify-between p-3 rounded-xl border ${
                          isFirst
                            ? "bg-amber-50 border-amber-300 shadow-xs"
                            : "bg-white border-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-display font-bold text-xs flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <Avatar avatarId={p.avatarId} size="sm" ring={isFirst} />
                          <div>
                            <p className="font-display font-bold text-sm text-slate-900">
                              {p.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              ตำแหน่งปัจจุบัน: ช่อง {p.position}
                            </p>
                          </div>
                        </div>
                        <Badge variant={isFirst ? "gold" : "default"} size="sm">
                          {isFirst ? "กำลังรอทอย" : "รอคิว"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Live Leaderboard & Game Finished Summary */}
            <Card variant="default" padding="md" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h3 className="font-display font-bold text-base text-[#0f2547]">
                    อันดับคะแนนสด (Leaderboard)
                  </h3>
                </div>
                {state.gameStatus === "finished" && (
                  <Link href={`/teacher/reports?pin=${pin}`}>
                    <Button
                      variant="primary"
                      size="sm"
                      iconLeft={<FileBarChart className="w-4 h-4" />}
                    >
                      ดูรายงาน / พิมพ์ PDF
                    </Button>
                  </Link>
                )}
              </div>

              {state.gameStatus === "finished" && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 text-center space-y-2">
                  <Badge variant="gold" size="md">
                    🏁 การแข่งขันสิ้นสุดแล้ว!
                  </Badge>
                  <Leaderboard
                    entries={state.leaderboard}
                    mode="podium"
                    theme="light"
                  />
                </div>
              )}

              <Leaderboard
                entries={state.leaderboard.slice(0, 8)}
                mode="compact"
                theme="light"
              />

              {hasUnresolvedSpecialEvent && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    กรุณายืนยันจบ Special Event ก่อนเริ่มคำถามข้อถัดไป
                  </span>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
