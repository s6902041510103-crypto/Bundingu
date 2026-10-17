"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { TeacherLayoutShell } from "@/components/teacher/TeacherSidebar";
import { useTeacherAuth } from "@/lib/hooks/useTeacherAuth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Loading } from "@/components/ui/Loading";
import { Avatar } from "@/components/game/Avatar";
import { SUBJECTS } from "@/lib/game-data";
import type { GameHistoryRecord } from "@/lib/types";
import { Search, FileBarChart, Play } from "lucide-react";

export default function TeacherHistoryPage() {
  const { teacher, loading: authLoading } = useTeacherAuth(true);
  const [history, setHistory] = useState<GameHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [subjectFilter, setSubjectFilter] = useState("ทั้งหมด");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch("/api/history", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setHistory(Array.isArray(data.history) ? data.history : []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, []);

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      if (subjectFilter !== "ทั้งหมด" && item.subject !== subjectFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchPin = item.pin.includes(q);
        const matchWinner = (item.winnerName || "").toLowerCase().includes(q);
        if (!matchTitle && !matchPin && !matchWinner) return false;
      }
      if (dateFilter) {
        const itemDate = new Date(item.createdAt).toISOString().slice(0, 10);
        if (itemDate !== dateFilter) return false;
      }
      return true;
    });
  }, [history, subjectFilter, searchQuery, dateFilter]);

  if (authLoading || loading) {
    return <Loading fullScreen label="กำลังโหลดประวัติการเล่นเกม..." />;
  }

  return (
    <TeacherLayoutShell
      teacher={teacher}
      title="ประวัติการเล่นเกม"
      subtitle="รายการห้องเกมที่สร้างและบันทึกผลการแข่งขันจริง"
    >
      <div className="space-y-6">
        {/* Filter Bar (Matches Reference Screen #7) */}
        <Card variant="default" padding="md">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
            <div className="sm:col-span-4">
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

            <div className="sm:col-span-4">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                aria-label="เลือกวันที่"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-4 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อเกม หรือ PIN..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>
        </Card>

        {/* History Table (Matches Reference Screen #7) */}
        <Card variant="default" padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-display font-semibold text-slate-500">
                  <th className="py-3.5 px-5">วันที่</th>
                  <th className="py-3.5 px-4">ชื่อเกม</th>
                  <th className="py-3.5 px-4">PIN</th>
                  <th className="py-3.5 px-4">ผู้เล่น</th>
                  <th className="py-3.5 px-4">ผู้ชนะ / ผู้นำ</th>
                  <th className="py-3.5 px-4">สถานะ</th>
                  <th className="py-3.5 px-5 text-right">รายงาน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      ไม่พบประวัติเกมที่ตรงกับตัวกรอง
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((item) => {
                    const dateStr = new Date(item.createdAt).toLocaleDateString(
                      "th-TH",
                      { day: "2-digit", month: "2-digit", year: "numeric" },
                    );
                    const isLive =
                      item.status === "lobby" || item.status === "playing";

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-4 px-5 text-slate-600 font-mono text-xs sm:text-sm">
                          {dateStr}
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-display font-bold text-slate-900">
                            {item.title}
                          </div>
                          <div className="text-xs text-slate-500">
                            {item.subject} · {item.roundsPlayed}/{item.totalRounds} รอบ
                          </div>
                        </td>
                        <td className="py-4 px-4 font-mono font-bold text-blue-700">
                          {item.pin}
                        </td>
                        <td className="py-4 px-4 font-medium text-slate-700">
                          {item.playersCount} คน
                        </td>
                        <td className="py-4 px-4">
                          {item.winnerName ? (
                            <div className="inline-flex items-center gap-2">
                              {item.winnerAvatarId && (
                                <Avatar avatarId={item.winnerAvatarId} size="xs" />
                              )}
                              <span className="font-display font-semibold text-slate-800">
                                {item.winnerName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          {isLive ? (
                            <Badge variant="success" size="sm" dot>
                              กำลังดำเนินการ
                            </Badge>
                          ) : (
                            <Badge variant="default" size="sm" dot>
                              เสร็จสิ้น
                            </Badge>
                          )}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <div className="inline-flex items-center gap-2">
                            {isLive && (
                              <Link href={`/teacher/games/${item.pin}`}>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  iconLeft={<Play className="w-3.5 h-3.5" />}
                                >
                                  ควบคุม
                                </Button>
                              </Link>
                            )}
                            <Link href={`/teacher/reports?pin=${item.pin}`}>
                              <Button
                                variant="secondary"
                                size="sm"
                                iconLeft={<FileBarChart className="w-3.5 h-3.5" />}
                              >
                                ดูผล / PDF
                              </Button>
                            </Link>
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
    </TeacherLayoutShell>
  );
}
