"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { TeacherLayoutShell } from "@/components/teacher/TeacherSidebar";
import { useTeacherAuth } from "@/lib/hooks/useTeacherAuth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Loading } from "@/components/ui/Loading";
import { QRCodeSVG } from "@/components/ui/QRCode";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { Avatar } from "@/components/game/Avatar";
import type { GameHistoryRecord, GameState } from "@/lib/types";
import {
  Plus,
  Play,
  Users,
  BookOpen,
  Trophy,
  Calendar,
  ExternalLink,
  StopCircle,
  FileBarChart,
  Gamepad2,
  RotateCcw,
} from "lucide-react";

export default function TeacherDashboardPage() {
  const { teacher, loading: authLoading } = useTeacherAuth(true);
  const { toasts, addToast, removeToast } = useToast();

  const [activeRooms, setActiveRooms] = useState<GameState[]>([]);
  const [history, setHistory] = useState<GameHistoryRecord[]>([]);
  const [questionsCount, setQuestionsCount] = useState<number>(0);
  const [loadingData, setLoadingData] = useState(true);

  // Re-open room for a new class of students modal state
  const [reopenTarget, setReopenTarget] = useState<GameHistoryRecord | null>(null);
  const [reopenTitle, setReopenTitle] = useState<string>("");
  const [isReopening, setIsReopening] = useState<boolean>(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await fetch("/api/games", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setActiveRooms(Array.isArray(data.activeRooms) ? data.activeRooms : []);
      setHistory(Array.isArray(data.history) ? data.history : []);
      setQuestionsCount(typeof data.questionsCount === "number" ? data.questionsCount : 0);
    } catch {
      // ignore transient error
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const timer = window.setInterval(fetchDashboardData, 4000);
    return () => window.clearInterval(timer);
  }, [fetchDashboardData]);

  const handleEndGame = async (pin: string) => {
    try {
      const res = await fetch(`/api/games/${encodeURIComponent(pin)}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "END_GAME" }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        addToast({
          title: "ไม่สามารถสิ้นสุดเกมได้",
          description: data.error || "กรุณาลองใหม่อีกครั้ง",
          variant: "danger",
        });
        return;
      }
      addToast({
        title: `สิ้นสุดเกม PIN ${pin} แล้ว`,
        description: "บันทึกผลคะแนนลงในประวัติเกมเรียบร้อยแล้ว",
        variant: "success",
      });
      fetchDashboardData();
    } catch {
      addToast({
        title: "เกิดข้อผิดพลาดในการเชื่อมต่อ",
        variant: "danger",
      });
    }
  };

  const openReopenModal = (game: GameHistoryRecord) => {
    setReopenTarget(game);
    setReopenTitle(`${game.title} (ห้องใหม่)`);
  };

  const handleConfirmReopen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenTarget || !reopenTitle.trim()) return;

    setIsReopening(true);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: reopenTitle.trim(),
          subject: reopenTarget.subject,
          totalRounds: reopenTarget.totalRounds,
          questionTimeLimit: reopenTarget.questionTimeLimit,
          maxPlayers: reopenTarget.maxPlayers || 40,
          questionIds: reopenTarget.questionIds,
          enabledSpecials: reopenTarget.enabledSpecials ?? ["star", "gift", "boost"],
          seedDemoPlayers: false,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error || !data.pin) {
        addToast({
          title: "ไม่สามารถเปิดห้องใหม่ได้",
          description: data.error || "กรุณาตรวจสอบว่าชุดเกมนี้มีคำถามในคลังอย่างน้อย 1 ข้อ",
          variant: "danger",
        });
        setIsReopening(false);
        return;
      }

      setReopenTarget(null);
      await fetchDashboardData();
      addToast({
        title: `เปิดห้องใหม่สำเร็จ! คีย์ห้องคือ ${data.pin}`,
        description: `ใช้ชุดคำถามเดิมสำหรับ "${reopenTitle.trim()}" เรียบร้อยแล้ว`,
        variant: "success",
      });
    } catch {
      addToast({
        title: "เกิดข้อผิดพลาดในการเชื่อมต่อ",
        variant: "danger",
      });
    } finally {
      setIsReopening(false);
    }
  };

  if (authLoading || loadingData) {
    return <Loading fullScreen label="กำลังโหลดแดชบอร์ดครู..." />;
  }

  const currentActiveRoom =
    activeRooms.find((r) => r.gameStatus !== "finished") ?? null;

  const totalGames = history.length;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const gamesToday = history.filter((h) => h.createdAt >= startOfToday.getTime()).length;
  const totalPlayers = history.reduce((sum, h) => sum + (h.playersCount || 0), 0);

  return (
    <TeacherLayoutShell
      teacher={teacher}
      title="หน้าหลัก"
      subtitle="ภาพรวมห้องเรียน สถิติจริง และเกมที่กำลังดำเนินการ"
      actions={
        <Link href="/teacher/games/new">
          <Button variant="primary" size="md" iconLeft={<Plus className="w-4 h-4" />}>
            สร้างเกมใหม่
          </Button>
        </Link>
      }
    >
      <div className="space-y-7">
        {/* Active Game Card (Matches Reference Screen #3) */}
        {currentActiveRoom ? (
          <div className="rounded-3xl overflow-hidden bg-white border border-emerald-200 shadow-card">
            <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 px-6 py-3 flex items-center justify-between text-white">
              <div className="flex items-center gap-2 font-display font-bold text-base">
                <Gamepad2 className="w-5 h-5" />
                <span>เกมที่กำลังดำเนินการ</span>
              </div>
              <Badge
                variant="gold"
                size="sm"
                className="bg-white/20 text-white border-white/30"
              >
                {currentActiveRoom.gameStatus === "lobby"
                  ? "รอผู้เล่นเข้าห้อง"
                  : `กำลังเล่น · รอบที่ ${currentActiveRoom.round}/${currentActiveRoom.totalRounds}`}
              </Badge>
            </div>

            <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <Avatar avatarId="panda" size="md" ring />
                  <div>
                    <h2 className="font-display text-xl sm:text-2xl font-extrabold text-[#0f2547]">
                      {currentActiveRoom.game.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500">
                      หมวดวิชา: {currentActiveRoom.game.subject} · โฮสต์:{" "}
                      {currentActiveRoom.game.hostName}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <div className="px-4 py-2 rounded-2xl bg-blue-50 border border-blue-200">
                    <span className="text-xs text-blue-700 font-medium block">
                      Game PIN
                    </span>
                    <span className="font-display text-2xl font-black text-blue-800 tracking-wider">
                      {currentActiveRoom.game.pin}
                    </span>
                  </div>

                  <div className="px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <span className="text-xs text-emerald-700 font-medium block">
                      ผู้เล่นในห้อง
                    </span>
                    <span className="font-display text-xl font-bold text-emerald-800">
                      {currentActiveRoom.players.length}/
                      {currentActiveRoom.settings.maxPlayers} คน
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link href={`/teacher/games/${currentActiveRoom.game.pin}`}>
                    <Button
                      variant="primary"
                      size="md"
                      iconLeft={<Play className="w-4 h-4" />}
                    >
                      เปิดหน้าควบคุมเกมสด
                    </Button>
                  </Link>
                  <Link href={`/game/${currentActiveRoom.game.pin}/projector`}>
                    <Button
                      variant="secondary"
                      size="md"
                      iconLeft={<ExternalLink className="w-4 h-4" />}
                    >
                      เปิดจอ Projector
                    </Button>
                  </Link>
                  <Button
                    variant="destructive"
                    size="md"
                    onClick={() => handleEndGame(currentActiveRoom.game.pin)}
                    iconLeft={<StopCircle className="w-4 h-4" />}
                  >
                    สิ้นสุดเกม
                  </Button>
                </div>
              </div>

              {/* Real QR Code for Joining */}
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 border border-slate-200 self-center md:self-auto">
                <QRCodeSVG
                  value={`/join?pin=${currentActiveRoom.game.pin}`}
                  size={112}
                />
                <span className="text-xs font-display font-semibold text-slate-600 mt-2">
                  สแกน QR เพื่อเข้าร่วม
                </span>
              </div>
            </div>
          </div>
        ) : (
          <Card variant="elevated" padding="lg" className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-[#0f2547]">
                ยังไม่มีห้องเกมที่กำลังเปิดอยู่ในขณะนี้
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                กดปุ่มสร้างเกมใหม่เพื่อรับ Game PIN และ QR Code สำหรับให้นักเรียนเข้าร่วม
              </p>
            </div>
            <Link href="/teacher/games/new">
              <Button variant="primary" size="lg" iconLeft={<Plus className="w-5 h-5" />}>
                สร้างเกมใหม่ทันที
              </Button>
            </Link>
          </Card>
        )}

        {/* 4 Summary Cards with Real Data (Matches Reference Screen #3) */}
        <section
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          aria-label="สรุปสถิติห้องเรียน"
        >
          <Card variant="default" padding="md" className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-display font-medium text-slate-500">
                เกมทั้งหมด
              </p>
              <p className="font-display text-3xl sm:text-4xl font-extrabold text-[#0f2547] mt-1">
                {totalGames}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Trophy className="w-6 h-6" />
            </div>
          </Card>

          <Card variant="default" padding="md" className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-display font-medium text-slate-500">
                วันนี้
              </p>
              <p className="font-display text-3xl sm:text-4xl font-extrabold text-emerald-600 mt-1">
                {gamesToday}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
          </Card>

          <Card variant="default" padding="md" className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-display font-medium text-slate-500">
                ผู้เล่นรวม
              </p>
              <p className="font-display text-3xl sm:text-4xl font-extrabold text-blue-600 mt-1">
                {totalPlayers}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </Card>

          <Card variant="default" padding="md" className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-display font-medium text-slate-500">
                คำถามในคลัง
              </p>
              <p className="font-display text-3xl sm:text-4xl font-extrabold text-amber-600 mt-1">
                {questionsCount}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
          </Card>
        </section>

        {/* Recent Games Table (Matches Reference Screen #3) */}
        <Card variant="default" padding="none" className="overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#0f2547]">เกมล่าสุด</h2>
            <Link
              href="/teacher/history"
              className="text-xs sm:text-sm font-display font-semibold text-blue-600 hover:underline"
            >
              ดูประวัติทั้งหมด →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-display font-semibold text-slate-500">
                  <th className="py-3.5 px-5">ชื่อเกม</th>
                  <th className="py-3.5 px-4">PIN</th>
                  <th className="py-3.5 px-4">วันที่</th>
                  <th className="py-3.5 px-4">ผู้เล่น</th>
                  <th className="py-3.5 px-4">ผู้นำ/ผู้ชนะ</th>
                  <th className="py-3.5 px-4">สถานะ</th>
                  <th className="py-3.5 px-5 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 px-6 text-center text-slate-500">
                      ยังไม่มีประวัติการสร้างห้องเกม — กดปุ่ม{" "}
                      <Link href="/teacher/games/new" className="text-blue-600 font-bold underline">
                        สร้างเกมใหม่
                      </Link>{" "}
                      เพื่อเริ่มห้องเรียนแรกของคุณ
                    </td>
                  </tr>
                ) : (
                  history.slice(0, 6).map((game) => {
                    const isLive =
                      game.status === "lobby" || game.status === "playing";
                    const dateStr = new Date(game.createdAt).toLocaleDateString(
                      "th-TH",
                      { day: "2-digit", month: "2-digit", year: "numeric" },
                    );

                    return (
                    <tr
                      key={game.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-5">
                        <div className="font-display font-bold text-slate-900">
                          {game.title}
                        </div>
                        <div className="text-xs text-slate-500">{game.subject}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                        {game.pin}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{dateStr}</td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {game.playersCount} คน
                      </td>
                      <td className="py-3.5 px-4">
                        {game.winnerName ? (
                          <div className="inline-flex items-center gap-2">
                            {game.winnerAvatarId && (
                              <Avatar avatarId={game.winnerAvatarId} size="xs" />
                            )}
                            <span className="font-medium text-slate-800">
                              {game.winnerName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {isLive ? (
                          <Badge variant="success" size="sm" dot>
                            {game.status === "lobby" ? "รอเริ่ม" : "กำลังเล่น"}
                          </Badge>
                        ) : (
                          <Badge variant="default" size="sm" dot>
                            เสร็จสิ้น
                          </Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openReopenModal(game)}
                            iconLeft={<RotateCcw className="w-3.5 h-3.5" />}
                          >
                            เปิดห้องใหม่ (เปลี่ยนห้องเรียน)
                          </Button>
                          {isLive ? (
                            <Link href={`/teacher/games/${game.pin}`}>
                              <Button
                                variant="primary"
                                size="sm"
                                iconLeft={<Play className="w-3.5 h-3.5" />}
                              >
                                ควบคุมเกม
                              </Button>
                            </Link>
                          ) : (
                            <Link href={`/teacher/reports?pin=${game.pin}`}>
                              <Button
                                variant="secondary"
                                size="sm"
                                iconLeft={<FileBarChart className="w-3.5 h-3.5" />}
                              >
                                ดูรายงาน
                              </Button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Modal: Open a New Room from a Saved Game for a New Classroom */}
      <Modal
        isOpen={Boolean(reopenTarget)}
        onClose={() => setReopenTarget(null)}
        title="เปิดห้องใหม่จากชุดเกมเดิม (สำหรับเมื่อเด็กเปลี่ยนห้อง)"
        description="ใช้ชุดคำถาม รายวิชา จำนวนรอบ และเวลาตอบเดิมทั้งหมด แต่สร้างคีย์ห้องใหม่และ QR Code ใหม่ให้นักเรียนกลุ่มใหม่"
        size="md"
      >
        {reopenTarget && (
          <form onSubmit={handleConfirmReopen} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <p>
                ต้นฉบับ: <strong className="text-slate-900">{reopenTarget.title}</strong> (คีย์เดิม:{" "}
                <span className="font-mono font-bold text-blue-700">{reopenTarget.pin}</span>)
              </p>
              <p>
                รายวิชา: <strong>{reopenTarget.subject}</strong> · จำนวนรอบ:{" "}
                <strong>{reopenTarget.totalRounds} รอบ</strong> · เวลาตอบ:{" "}
                <strong>{reopenTarget.questionTimeLimit} วินาที/ข้อ</strong>
              </p>
            </div>

            <div>
              <label className="block font-display text-sm font-bold text-slate-700 mb-1.5">
                ตั้งชื่อห้องเรียนใหม่ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={reopenTitle}
                onChange={(e) => setReopenTitle(e.target.value)}
                placeholder="เช่น คณิตศาสตร์ ม.1/2"
                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <Link
                href={`/teacher/games/new?templatePin=${reopenTarget.pin}`}
                className="text-xs font-display font-semibold text-blue-600 hover:underline"
              >
                แก้ไข/เพิ่มคำถามก่อนเปิดห้อง →
              </Link>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setReopenTarget(null)}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={isReopening}
                  iconLeft={<RotateCcw className="w-4 h-4" />}
                >
                  สร้างห้องใหม่และรับคีย์ทันที
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </TeacherLayoutShell>
  );
}