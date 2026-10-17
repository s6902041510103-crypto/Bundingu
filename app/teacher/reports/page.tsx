"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TeacherLayoutShell } from "@/components/teacher/TeacherSidebar";
import { useTeacherAuth } from "@/lib/hooks/useTeacherAuth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Loading } from "@/components/ui/Loading";
import { Avatar } from "@/components/game/Avatar";
import { Leaderboard } from "@/components/game/Leaderboard";
import type { GameHistoryRecord, LeaderboardEntry } from "@/lib/types";
import { Printer, Trophy, Users, Calendar, CheckCircle2 } from "lucide-react";

function ReportsContent() {
  const { teacher, loading: authLoading } = useTeacherAuth(true);
  const searchParams = useSearchParams();
  const initialPin = searchParams.get("pin") || "";

  const [history, setHistory] = useState<GameHistoryRecord[]>([]);
  const [selectedPin, setSelectedPin] = useState<string>(initialPin);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch("/api/history", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const list: GameHistoryRecord[] = Array.isArray(data.history)
          ? data.history
          : [];
        setHistory(list);
        if (!selectedPin && list.length > 0) {
          setSelectedPin(list[0].pin);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, [selectedPin]);

  if (authLoading || loading) {
    return <Loading fullScreen label="กำลังจัดเตรียมรายงานผลการแข่งขัน..." />;
  }

  const activeRecord =
    history.find((h) => h.pin === selectedPin || h.id === selectedPin) ??
    history[0] ??
    null;

  const podiumEntries: LeaderboardEntry[] = (
    activeRecord?.playerResults ?? []
  ).map((r) => ({
    rank: r.rank,
    playerId: r.playerId,
    name: r.name,
    avatarId: r.avatarId,
    position: r.position,
    score: r.score,
    isFinished: r.isFinished,
  }));

  const handlePrintA4 = () => {
    window.print();
  };

  return (
    <TeacherLayoutShell
      teacher={teacher}
      title="ผลการแข่งขัน / รายงาน A4"
      subtitle="รายละเอียดคะแนนผู้เล่น อัตราความแม่นยำจริง และพิมพ์หรือส่งออก PDF ขนาด A4"
      actions={
        <div className="flex items-center gap-2.5 no-print">
          <select
            value={activeRecord?.pin ?? ""}
            onChange={(e) => setSelectedPin(e.target.value)}
            aria-label="เลือกห้องเกมเพื่อดูรายงาน"
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm font-display font-semibold text-slate-800"
          >
            {history.map((h) => (
              <option key={h.id} value={h.pin}>
                {h.title} (PIN: {h.pin})
              </option>
            ))}
          </select>

          <Button
            variant="primary"
            size="md"
            onClick={handlePrintA4}
            iconLeft={<Printer className="w-4 h-4" />}
          >
            ดาวน์โหลด PDF / พิมพ์ A4
          </Button>
        </div>
      }
    >
      {!activeRecord ? (
        <Card variant="default" padding="lg" className="text-center text-slate-500">
          ยังไม่มีข้อมูลประวัติการแข่งขันสำหรับสร้างรายงาน
        </Card>
      ) : (
        <div className="print-a4-sheet bg-white rounded-3xl border border-slate-200 shadow-card p-6 sm:p-8 space-y-6">
          {/* Report Header (Matches Reference Screen #8) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center shadow-xs">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-extrabold text-[#0f2547]">
                  ผลการแข่งขัน: {activeRecord.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  หมวดวิชา: {activeRecord.subject} · Game PIN:{" "}
                  <strong className="font-mono text-blue-700">
                    {activeRecord.pin}
                  </strong>{" "}
                  · โฮสต์: {activeRecord.hostName}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
                <Calendar className="w-4 h-4 text-blue-600" />
                {new Date(activeRecord.createdAt).toLocaleDateString("th-TH", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
                <Users className="w-4 h-4 text-emerald-600" />
                ผู้เล่น {activeRecord.playersCount} คน
              </span>
            </div>
          </div>

          {/* Top 3 Podium Showcase (Matches Reference Screen #8) */}
          {podiumEntries.length > 0 && (
            <div className="rounded-2xl bg-gradient-to-b from-sky-50/70 to-white border border-sky-100 p-4">
              <Leaderboard
                entries={podiumEntries}
                mode="podium"
                theme="light"
                highlightViewer={false}
              />
            </div>
          )}

          {/* Detailed Player Results Table (Matches Reference Screen #8) */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 bg-slate-50 text-xs font-display font-bold text-slate-600">
                  <th className="py-3 px-4">อันดับ</th>
                  <th className="py-3 px-4">ชื่อผู้เล่น</th>
                  <th className="py-3 px-4">คะแนนสุดท้าย</th>
                  <th className="py-3 px-4">ตำแหน่ง/โบนัสเส้นชัย</th>
                  <th className="py-3 px-4 text-center">บันได 🪜</th>
                  <th className="py-3 px-4 text-center">งู 🐍</th>
                  <th className="py-3 px-4 text-center text-emerald-700">ตอบถูก ✓</th>
                  <th className="py-3 px-4 text-center text-rose-600">ตอบผิด ✗</th>
                  <th className="py-3 px-4 text-right">ความแม่นยำ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {activeRecord.playerResults.map((row) => (
                  <tr key={row.playerId} className="hover:bg-slate-50/60">
                    <td className="py-3.5 px-4 font-display font-extrabold text-[#0f2547]">
                      {row.rank}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar avatarId={row.avatarId} size="xs" />
                        <span className="font-display font-bold text-slate-900">
                          {row.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-extrabold text-blue-700">
                      {row.score}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-slate-700 font-medium">
                        ช่อง {row.position}
                      </span>
                      {row.finishBonus > 0 && (
                        <span className="ml-2 text-xs font-bold text-emerald-600">
                          (+{row.finishBonus} โบนัส)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-emerald-700 font-semibold">
                      {row.laddersClimbed}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-red-600 font-semibold">
                      {row.snakesBitten}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-600">
                      {row.correctCount}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-rose-600">
                      {row.wrongCount ?? Math.max(0, row.answeredCount - row.correctCount)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {/* Never fabricate fake accuracy when answeredCount === 0 */}
                      {row.accuracyPercent !== null && row.answeredCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 font-mono font-bold text-slate-900">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {row.accuracyPercent}%
                        </span>
                      ) : (
                        <Badge variant="default" size="sm">
                          ยังไม่มีข้อมูล
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </TeacherLayoutShell>
  );
}

export default function TeacherReportsPage() {
  return (
    <Suspense fallback={<Loading fullScreen />}>
      <ReportsContent />
    </Suspense>
  );
}
