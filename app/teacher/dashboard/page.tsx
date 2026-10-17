"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TeacherLayoutShell } from "@/components/teacher/TeacherSidebar";
import { useTeacherAuth } from "@/lib/hooks/useTeacherAuth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
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
  FolderKanban,
  Calendar,
  ExternalLink,
  StopCircle,
  Gamepad2,
  RotateCcw,
  Trash2,
} from "lucide-react";

export default function TeacherDashboardPage() {
  const router = useRouter();
  const { teacher, loading: authLoading } = useTeacherAuth(true);
  const { toasts, addToast, removeToast } = useToast();

  const [activeRooms, setActiveRooms] = useState<GameState[]>([]);
  const [savedRooms, setSavedRooms] = useState<GameHistoryRecord[]>([]);
  const [questionsCount, setQuestionsCount] = useState<number>(0);
  const [loadingData, setLoadingData] = useState(true);
  const [busyPin, setBusyPin] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await fetch("/api/games", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setActiveRooms(Array.isArray(data.activeRooms) ? data.activeRooms : []);
      setSavedRooms(Array.isArray(data.history) ? data.history : []);
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
        title: `ปิดรอบการเล่นของห้อง ${pin} แล้ว`,
        description: "ห้องเกมนี้ยังคงถูกเก็บไว้ สามารถกดเปิดใช้งานใหม่ได้ตลอดเวลา",
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

  const handleOpenSavedRoom = async (room: GameHistoryRecord, forceReset = false) => {
    setBusyPin(room.pin);
    try {
      if (forceReset || room.status === "completed") {
        const res = await fetch(`/api/games/${encodeURIComponent(room.pin)}/command`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "RESET_ROOM" }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          addToast({
            title: "ไม่สามารถเปิดห้องเกมนี้ได้",
            description: data.error || "กรุณาลองใหม่อีกครั้ง",
            variant: "danger",
          });
          setBusyPin(null);
          return;
        }
      }
      router.push(`/teacher/games/${room.pin}`);
    } catch {
      addToast({
        title: "เกิดข้อผิดพลาดในการเชื่อมต่อ",
        variant: "danger",
      });
      setBusyPin(null);
    }
  };

  const handleDeleteSavedRoom = async (room: GameHistoryRecord) => {
    setBusyPin(room.pin);
    try {
      const res = await fetch(`/api/games?pin=${encodeURIComponent(room.pin)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        addToast({
          title: "ไม่สามารถลบห้องเกมได้",
          description: data.error || "กรุณาลองใหม่อีกครั้ง",
          variant: "danger",
        });
        setBusyPin(null);
        return;
      }

      setSavedRooms((prev) => prev.filter((r) => r.pin !== room.pin && r.id !== room.id));
      setActiveRooms((prev) => prev.filter((r) => r.game.pin !== room.pin));
      addToast({
        title: `ลบห้องเกม "${room.title}" (${room.pin}) เรียบร้อยแล้ว`,
        variant: "info",
      });
    } catch {
      addToast({
        title: "เกิดข้อผิดพลาดในการลบห้องเกม",
        variant: "danger",
      });
    } finally {
      setBusyPin(null);
    }
  };

  if (authLoading || loadingData) {
    return <Loading fullScreen label="กำลังโหลดแดชบอร์ดครู..." />;
  }

  const currentActiveRoom =
    activeRooms.find((r) => r.gameStatus !== "finished") ?? null;

  const totalSavedRooms = savedRooms.length;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const roomsCreatedToday = savedRooms.filter(
    (h) => h.createdAt >= startOfToday.getTime(),
  ).length;
  const activeCount = activeRooms.filter((r) => r.gameStatus !== "finished").length;

  return (
    <TeacherLayoutShell
      teacher={teacher}
      title="หน้าหลัก"
      subtitle="จัดการห้องเกมที่สร้างไว้ เปิดใช้ซ้ำได้ตลอดเวลาสำหรับทุกห้องเรียน"
      actions={
        <Link href="/teacher/games/new">
          <Button variant="primary" size="md" iconLeft={<Plus className="w-4 h-4" />}>
            สร้างห้องเกมใหม่
          </Button>
        </Link>
      }
    >
      <div className="space-y-7">
        {/* Active Game Card */}
        {currentActiveRoom ? (
          <div className="rounded-3xl overflow-hidden bg-white border border-emerald-200 shadow-card">
            <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 px-6 py-3 flex items-center justify-between text-white">
              <div className="flex items-center gap-2 font-display font-bold text-base">
                <Gamepad2 className="w-5 h-5" />
                <span>ห้องเกมที่กำลังเปิดอยู่</span>
              </div>
              <Badge
                variant="gold"
                size="sm"
                className="bg-white/20 text-white border-white/30"
              >
                {currentActiveRoom.gameStatus === "lobby"
                  ? "รอนักเรียนเข้าห้อง"
                  : `กำลังเล่น · ข้อที่ ${currentActiveRoom.round}/${currentActiveRoom.totalRounds}`}
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
                      คีย์ห้อง (PIN)
                    </span>
                    <span className="font-display text-2xl font-black text-blue-800 tracking-wider">
                      {currentActiveRoom.game.pin}
                    </span>
                  </div>

                  <div className="px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <span className="text-xs text-emerald-700 font-medium block">
                      ผู้เล่นในห้องตอนนี้
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
                      เข้าหน้าควบคุมห้องเกม
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
                    จบเกมรอบนี้
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
                เลือกเปิดห้องเกมที่สร้างไว้ด้านล่าง หรือสร้างห้องเกมใหม่
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                ห้องเกมที่คุณสร้างจะถูกเก็บไว้ถาวร สามารถกดเปิดใช้งานซ้ำได้ตลอดเวลาเมื่อเปลี่ยนห้องเรียน หรือลบออกได้ตามต้องการ
              </p>
            </div>
            <Link href="/teacher/games/new">
              <Button variant="primary" size="lg" iconLeft={<Plus className="w-5 h-5" />}>
                สร้างห้องเกมใหม่
              </Button>
            </Link>
          </Card>
        )}

        {/* 4 Summary Cards */}
        <section
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          aria-label="สรุปข้อมูลห้องเกม"
        >
          <Card variant="default" padding="md" className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-display font-medium text-slate-500">
                ห้องเกมที่สร้างไว้
              </p>
              <p className="font-display text-3xl sm:text-4xl font-extrabold text-[#0f2547] mt-1">
                {totalSavedRooms}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FolderKanban className="w-6 h-6" />
            </div>
          </Card>

          <Card variant="default" padding="md" className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-display font-medium text-slate-500">
                สร้างวันนี้
              </p>
              <p className="font-display text-3xl sm:text-4xl font-extrabold text-emerald-600 mt-1">
                {roomsCreatedToday}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
          </Card>

          <Card variant="default" padding="md" className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-display font-medium text-slate-500">
                กำลังเปิดใช้งาน
              </p>
              <p className="font-display text-3xl sm:text-4xl font-extrabold text-blue-600 mt-1">
                {activeCount}
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

        {/* Saved Rooms Table — Open anytime forever or delete */}
        <Card variant="default" padding="none" className="overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-[#0f2547]">
                ห้องเกมที่สร้างเก็บไว้ (เปิดใช้งานได้ตลอด)
              </h2>
              <p className="text-xs text-slate-500">
                บันทึกเฉพาะห้องเกมที่สร้างไว้ ไม่ต้องเก็บประวัติการเล่นซ้ำซ้อน สามารถกดเปิดใช้หรือลบห้องได้ทันที
              </p>
            </div>
            <Link
              href="/teacher/history"
              className="text-xs sm:text-sm font-display font-semibold text-blue-600 hover:underline"
            >
              จัดการห้องทั้งหมด →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-display font-semibold text-slate-500">
                  <th className="py-3.5 px-5">ชื่อห้องเกม</th>
                  <th className="py-3.5 px-4">คีย์ห้อง (PIN)</th>
                  <th className="py-3.5 px-4">หมวดวิชา</th>
                  <th className="py-3.5 px-4">จำนวนข้อ / เวลาตอบ</th>
                  <th className="py-3.5 px-4">สถานะห้อง</th>
                  <th className="py-3.5 px-5 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {savedRooms.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 px-6 text-center text-slate-500">
                      ยังไม่มีห้องเกมที่สร้างเก็บไว้ — กดปุ่ม{" "}
                      <Link href="/teacher/games/new" className="text-blue-600 font-bold underline">
                        สร้างห้องเกมใหม่
                      </Link>{" "}
                      เพื่อบันทึกห้องไว้ใช้สอนได้เลย
                    </td>
                  </tr>
                ) : (
                  savedRooms.map((game) => {
                    const isLive =
                      game.status === "lobby" || game.status === "playing";
                    const isBusy = busyPin === game.pin;
                    const questionCount = game.questionIds?.length || game.totalRounds;

                    return (
                      <tr
                        key={game.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3.5 px-5">
                          <div className="font-display font-bold text-slate-900">
                            {game.title}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                          {game.pin}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {game.subject}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {questionCount} ข้อ ({game.totalRounds} รอบ · {game.questionTimeLimit} วิ/ข้อ)
                        </td>
                        <td className="py-3.5 px-4">
                          {isLive ? (
                            <Badge variant="success" size="sm" dot>
                              {game.status === "lobby" ? "พร้อมรับนักเรียน" : "กำลังเปิดเล่น"}
                            </Badge>
                          ) : (
                            <Badge variant="primary" size="sm" dot>
                              บันทึกไว้ (พร้อมเปิดใช้)
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="inline-flex flex-wrap items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              loading={isBusy}
                              onClick={() => handleOpenSavedRoom(game, false)}
                              iconLeft={<Play className="w-3.5 h-3.5" />}
                            >
                              เปิดใช้ห้องนี้
                            </Button>
                            {isLive && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isBusy}
                                onClick={() => handleOpenSavedRoom(game, true)}
                                iconLeft={<RotateCcw className="w-3.5 h-3.5" />}
                                title="ล้างผู้เล่นเดิมและเริ่มรอนักเรียนกลุ่มใหม่ในห้องนี้"
                              >
                                รีเซ็ตห้องใหม่
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              disabled={isBusy}
                              onClick={() => handleDeleteSavedRoom(game)}
                              iconLeft={<Trash2 className="w-3.5 h-3.5" />}
                            >
                              ลบห้อง
                            </Button>
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

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </TeacherLayoutShell>
  );
}