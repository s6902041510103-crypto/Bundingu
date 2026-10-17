"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GameBoardWrapper } from "@/components/game/GameBoard";
import { MOCK_PLAYERS } from "@/lib/game-data";
import { Plus, Play, Users, Trash2, Edit, Clock, Trophy, ArrowRight, LogOut } from "lucide-react";

const RECENT_GAMES = [
  { id: "game-001", title: "วิทยาศาสตร์ ม.6", subject: "พลังงาน", rounds: 10, players: 24, createdAt: Date.now() - 86400000, status: "completed" },
  { id: "game-002", title: "เคมี ม.5", subject: "ตารางธงบัตร", rounds: 15, players: 18, createdAt: Date.now() - 172800000, status: "completed" },
  { id: "game-003", title: "ชีววิทยา ม.4", subject: "ระบบไหลเวียนโลหิต", rounds: 10, players: 32, createdAt: Date.now() - 259200000, status: "draft" },
];

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("ks-teacher");
    if (stored) {
      try {
        setTeacher(JSON.parse(stored));
      } catch {
        router.push("/teacher/login");
      }
    } else {
      router.push("/teacher/login");
    }
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem("ks-teacher");
    router.push("/teacher/login");
  };

  if (!teacher) {
    return (
      <div className="min-h-screen bg-bg-deep flex items-center justify-center">
        <div className="animate-pulse-soft text-slate-400">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-deep text-foreground font-body">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 glass-strong border-b border-slate-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-2xl">🐍</span>
                <span className="font-display font-bold text-xl gradient-text">Knowledge Snake</span>
              </Link>
              <Badge variant="gold" size="sm">แดชบอร์ดครู</Badge>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-300 hidden sm:block">{teacher.name}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">ออกจากระบบ</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Welcome Section */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="font-display text-3xl font-bold">สวัสดีครับ, {teacher.name}</h1>
                <p className="text-slate-400 mt-1">จัดการเกมของคุณ สร้างเกมใหม่ หรือดูประวัติเกมที่ผ่านมา</p>
              </div>
              <Link href="/teacher/create">
                <Button size="lg" variant="primary" iconLeft={<Plus className="w-5 h-5" />}>
                  สร้างเกมใหม่
                </Button>
              </Link>
            </div>
          </section>

          {/* Quick Stats */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card variant="glass" padding="lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">เกมที่สร้าง</p>
                  <p className="font-display text-3xl font-bold text-amber-400 mt-1">3</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-violet-400" />
                </div>
              </div>
            </Card>
            <Card variant="glass" padding="lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">นักเรียนรวม</p>
                  <p className="font-display text-3xl font-bold text-sky-400 mt-1">74</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-sky-400" />
                </div>
              </div>
            </Card>
            <Card variant="glass" padding="lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">เกมที่เสร็จแล้ว</p>
                  <p className="font-display text-3xl font-bold text-emerald-400 mt-1">2</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
            </Card>
            <Card variant="glass" padding="lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">รอการเล่น</p>
                  <p className="font-display text-3xl font-bold text-amber-400 mt-1">1</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-400" />
                </div>
              </div>
            </Card>
          </section>

          {/* Create New Game Card */}
          <section>
            <Card variant="glass-strong" padding="lg" className="border-amber-400/30 bg-gradient-to-br from-amber-500/5 to-transparent">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div>
                  <h2 className="font-display text-xl font-bold mb-1">พร้อมเริ่มเกมใหม่?</h2>
                  <p className="text-slate-400">สร้างห้องเรียน ได้ PIN และ QR Code เริ่มเล่นได้ทันที</p>
                </div>
                <Link href="/teacher/create">
                  <Button size="xl" variant="primary" iconLeft={<Play className="w-5 h-5" />}>
                    เริ่มสร้างเกม
                  </Button>
                </Link>
              </div>
            </Card>
          </section>

          {/* Recent Games */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-bold">เกมล่าสุด</h2>
              <Badge variant="info" size="sm">Phase 1: Mock Data</Badge>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {RECENT_GAMES.map((game) => (
                <Card key={game.id} variant="glass" padding="lg" className="group hover:border-violet-400/30 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-display font-bold text-lg">{game.title}</h3>
                      <p className="text-sm text-slate-400 mt-1">{game.subject}</p>
                    </div>
                    <Badge
                      variant={game.status === "completed" ? "success" : "default"}
                      className="text-xs"
                    >
                      {game.status === "completed" ? "เสร็จแล้ว" : "ร่าง"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      {game.players} คน
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Play className="w-4 h-4" />
                      {game.rounds} ข้อ
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/game/lobby?pin=${game.id}`}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      เข้าห้อง
                    </Link>
                    <Link
                      href={`/teacher/create?edit=${game.id}`}
                      className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors"
                      aria-label="แก้ไขเกม"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button
                      className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-red-500/20 hover:border-red-500 transition-colors text-red-400"
                      aria-label="ลบเกม"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Quick Board Preview */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4">ตัวอย่างกระดาน (Preview)</h2>
            <Card variant="elevated" padding="lg" className="max-w-3xl">
              <GameBoardWrapper
                players={MOCK_PLAYERS.slice(0, 10)}
                mode="preview"
                highlightCell={25}
                responsive={true}
              />
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}