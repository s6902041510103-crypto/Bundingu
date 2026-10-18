"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TeacherLayoutShell } from "@/components/teacher/TeacherSidebar";
import { useTeacherAuth } from "@/lib/hooks/useTeacherAuth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Loading } from "@/components/ui/Loading";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { SUBJECTS } from "@/lib/game-data";
import type { GameHistoryRecord } from "@/lib/types";
import { Search, Play, RotateCcw, Trash2, Plus } from "lucide-react";

export default function TeacherSavedRoomsPage() {
  const router = useRouter();
  const { teacher, loading: authLoading } = useTeacherAuth(true);
  const { toasts, addToast, removeToast } = useToast();
  const [savedRooms, setSavedRooms] = useState<GameHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyPin, setBusyPin] = useState<string | null>(null);

  const [subjectFilter, setSubjectFilter] = useState("ทั้งหมด");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadSavedRooms = async () => {
      try {
        const headers: Record<string, string> = {};
        if (teacher?.teacherId) headers["x-teacher-id"] = teacher.teacherId;
        if (teacher?.email) headers["x-teacher-email"] = teacher.email;
        const res = await fetch("/api/history", {
          cache: "no-store",
          credentials: "include",
          headers,
        });
        if (!res.ok) return;
        const data = await res.json();
        setSavedRooms(Array.isArray(data.history) ? data.history : []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    loadSavedRooms();
  }, [teacher?.teacherId, teacher?.email]);

  const handleOpenSavedRoom = async (room: GameHistoryRecord, forceReset = false) => {
    setBusyPin(room.pin);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (teacher?.teacherId) headers["x-teacher-id"] = teacher.teacherId;
      if (teacher?.email) headers["x-teacher-email"] = teacher.email;

      if (forceReset || (room.status as string) === "completed" || (room.status as string) === "finished") {
        const res = await fetch(`/api/games/${encodeURIComponent(room.pin)}/command`, {
          method: "POST",
          credentials: "include",
          headers,
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

  const handleDeleteRoom = async (room: GameHistoryRecord) => {
    setBusyPin(room.pin);
    try {
      const headers: Record<string, string> = {};
      if (teacher?.teacherId) headers["x-teacher-id"] = teacher.teacherId;
      if (teacher?.email) headers["x-teacher-email"] = teacher.email;
      const res = await fetch(`/api/history?pin=${encodeURIComponent(room.pin)}`, {
        method: "DELETE",
        credentials: "include",
        headers,
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
      setSavedRooms((prev) => prev.filter((item) => item.pin !== room.pin && item.id !== room.id));
      addToast({
        title: `ลบห้องเกม "${room.title}" (${room.pin}) แล้ว`,
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

  const filteredRooms = useMemo(() => {
    return savedRooms.filter((item) => {
      if (subjectFilter !== "ทั้งหมด" && item.subject !== subjectFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchPin = item.pin.toLowerCase().includes(q);
        if (!matchTitle && !matchPin) return false;
      }
      return true;
    });
  }, [savedRooms, subjectFilter, searchQuery]);

  if (authLoading || loading) {
    return <Loading fullScreen label="กำลังโหลดห้องเกมที่สร้างไว้..." />;
  }

  return (
    <TeacherLayoutShell
      teacher={teacher}
      title="ห้องเกมที่สร้างไว้"
      subtitle="รายการห้องเกมที่คุณสร้างเก็บไว้ สามารถกดเปิดใช้ซ้ำได้ตลอดเวลา หรือลบห้องที่ไม่ต้องการได้"
      actions={
        <Link href="/teacher/games/new">
          <Button variant="primary" size="md" iconLeft={<Plus className="w-4 h-4" />}>
            สร้างห้องเกมใหม่
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Filter Bar */}
        <Card variant="default" padding="md">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
            <div className="sm:col-span-5">
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                aria-label="กรองตามรายวิชา"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
              >
                <option value="ทั้งหมด">ทั้งหมด (ทุกหมวดวิชา)</option>
                {SUBJECTS.map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-7 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อห้องเกม หรือ คีย์ห้อง (PIN)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>
        </Card>

        {/* Saved Rooms Table */}
        <Card variant="default" padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-display font-semibold text-slate-500">
                  <th className="py-3.5 px-5">ชื่อห้องเกม</th>
                  <th className="py-3.5 px-4">คีย์ห้อง (PIN)</th>
                  <th className="py-3.5 px-4">หมวดวิชา</th>
                  <th className="py-3.5 px-4">จำนวนข้อ / เวลาตอบ</th>
                  <th className="py-3.5 px-4">สถานะห้อง</th>
                  <th className="py-3.5 px-5 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredRooms.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      ไม่พบห้องเกมที่สร้างไว้
                    </td>
                  </tr>
                ) : (
                  filteredRooms.map((item) => {
                    const isLive =
                      item.status === "lobby" || item.status === "playing";
                    const isBusy = busyPin === item.pin;
                    const questionCount = item.questionIds?.length || item.totalRounds;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-4 px-5">
                          <div className="font-display font-bold text-slate-900">
                            {item.title}
                          </div>
                        </td>
                        <td className="py-4 px-4 font-mono font-bold text-blue-700">
                          {item.pin}
                        </td>
                        <td className="py-4 px-4 font-medium text-slate-700">
                          {item.subject}
                        </td>
                        <td className="py-4 px-4 text-slate-600">
                          {questionCount} ข้อ ({item.totalRounds} รอบ · {item.questionTimeLimit} วิ/ข้อ)
                        </td>
                        <td className="py-4 px-4">
                          {isLive ? (
                            <Badge variant="success" size="sm" dot>
                              {item.status === "lobby" ? "พร้อมรับนักเรียน" : "กำลังเปิดเล่น"}
                            </Badge>
                          ) : (
                            <Badge variant="primary" size="sm" dot>
                              บันทึกไว้ (พร้อมเปิดใช้)
                            </Badge>
                          )}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <div className="inline-flex flex-wrap items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              loading={isBusy}
                              onClick={() => handleOpenSavedRoom(item, false)}
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
                                onClick={() => handleOpenSavedRoom(item, true)}
                                iconLeft={<RotateCcw className="w-3.5 h-3.5" />}
                              >
                                รีเซ็ตห้องใหม่
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              disabled={isBusy}
                              onClick={() => handleDeleteRoom(item)}
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
