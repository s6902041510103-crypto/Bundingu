"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/game/Avatar";
import { GameBoardWrapper } from "@/components/game/GameBoard";
import { MOCK_PLAYERS, AVATARS } from "@/lib/game-data";
import { Play, Users, Zap, Trophy, Shield, Sparkles } from "lucide-react";

const HOW_TO_PLAY = [
  { step: 1, title: "ครูสร้างเกม", desc: "เลือกจำนวนข้อ กดสร้าง ได้ PIN และ QR Code", icon: Play },
  { step: 2, title: "นักเรียนเข้าห้อง", desc: "สแกน QR หรือใส่ PIN ใส่ชื่อเล่น ได้อวตาร์สุ่ม", icon: Users },
  { step: 3, title: "ตอบคำถาม ทอยลูกเต๋า", desc: "ตอบถูกถึงได้ทอย เดินบนกระดาน 100 ช่อง", icon: Zap },
  { step: 4, title: "แข่งขึ้นอันดับ", desc: "งูดันลง บันไดขับขึ้น ใครถึงชัยก่อนชนะ", icon: Trophy },
];

const FEATURES = [
  { icon: Users, title: "Multiplayer จริง", desc: "รองรับ 40 คนพร้อมกัน ทุกคนเห็นกระดานเดียวกัน" },
  { icon: Zap, title: "Real-time Sync", desc: "BroadcastChannel sync ระหว่างจอครูและมือถือนักเรียน" },
  { icon: Shield, title: "ไม่ต้องสมัคร", desc: "นักเรียนใส่ชื่อเล่น เล่นได้ทันที ไม่มีบัญชี" },
  { icon: Sparkles, title: "Adventure Theme", desc: "งู บันได ของขวัญ โบนัส กราฟิกสวย พร้อมฉายห้องเรียน" },
];

export default function HomePage() {
  const previewPlayers = MOCK_PLAYERS.slice(0, 8);

  return (
    <div className="min-h-screen bg-bg-deep text-foreground font-body">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 glass-strong border-b border-slate-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden="true">🐍</span>
              <span className="font-display font-bold text-xl gradient-text">Knowledge Snake</span>
              <Badge variant="gold" size="sm">เกมบันไดงูพิชิตความรู้</Badge>
            </div>
            <nav className="flex items-center gap-4">
              <Link href="/join" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                จอยเกม
              </Link>
              <Link href="/teacher/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                สร้างเกม
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-16 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Hero */}
          <section className="mb-20 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium mb-6 animate-fade-in">
              <Sparkles className="w-4 h-4" />
              <span>Phase 1: Mock Data · UI Complete · Ready for Realtime</span>
            </div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              <span className="gradient-text">Knowledge Snake</span>
              <br />
              <span className="text-white">เกมบันไดงูพิชิตความรู้</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg sm:text-xl text-slate-300 mb-10 leading-relaxed">
              เกมการศึกษา Multiplayer แนว <span className="font-semibold text-amber-400">Kahoot × Snake & Ladder</span> —
              ครูสร้างเกม นักเรียนเข้าห้องด้วย PIN ตอบคำถาม ทอยลูกเต๋า เดินผ่านงูและบันได แข่งขันขึ้นอันดับ
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/join">
                <Button size="xl" variant="primary" iconLeft={<Play className="w-5 h-5" />}>
                  🎮 จอยเกม
                </Button>
              </Link>
              <Link href="/teacher/login">
                <Button size="xl" variant="secondary" iconLeft={<Users className="w-5 h-5" />}>
                  👨‍🏫 สร้างเกม
                </Button>
              </Link>
            </div>
          </section>

          {/* Game Board Preview */}
          <section className="mb-20">
            <div className="text-center mb-8">
              <h2 className="font-display text-3xl font-bold mb-2">ตัวอย่างกระดานเกม</h2>
              <p className="text-slate-400">GameBoard component จริง โหมด preview — เหมือนในเกมจริงทุกประการ</p>
            </div>
            <Card variant="elevated" padding="lg" className="max-w-4xl mx-auto">
              <GameBoardWrapper
                players={previewPlayers}
                mode="preview"
                highlightCell={25}
                responsive={true}
              />
            </Card>
          </section>

          {/* How to Play */}
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl font-bold mb-2">วิธีเล่น 4 ขั้นตอน</h2>
              <p className="text-slate-400">เริ่มได้ในไม่กี่นาที</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {HOW_TO_PLAY.map(({ step, title, desc, icon: Icon }) => (
                <Card key={step} variant="glass" padding="lg" className="relative group">
                  <div className="absolute -top-3 left-3 w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-display font-bold text-xl text-amber-400">
                    {step}
                  </div>
                  <div className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center mb-4 group-hover:bg-amber-500/10 transition-colors">
                      <Icon className="w-6 h-6 text-amber-400" />
                    </div>
                    <h3 className="font-display font-bold text-lg mb-2">{title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Features */}
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl font-bold mb-2">ทำไมต้อง Knowledge Snake?</h2>
              <p className="text-slate-400">ออกแบบมาเป็น Product จริง ไม่ใช่โปรโตไทป์</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <Card key={title} variant="glass" padding="lg" className="group hover:border-amber-400/30 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center mb-4 group-hover:bg-amber-500/10 transition-colors">
                    <Icon className="w-6 h-6 text-amber-400" />
                  </div>
                  <h3 className="font-display font-bold text-lg mb-2">{title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                </Card>
              ))}
            </div>
          </section>

          {/* Avatar Showcase */}
          <section className="mb-20">
            <div className="text-center mb-8">
              <h2 className="font-display text-3xl font-bold mb-2">อวตาร์ 12 สัตว์</h2>
              <p className="text-slate-400">ชุดเดียวกันทุกคน ใช้ SVG ทำเอง ดูเหมือนกันทุกอุปกรณ์</p>
            </div>
            <Card variant="glass" padding="lg">
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-6">
                {AVATARS.map((avatar) => (
                  <div key={avatar.id} className="flex flex-col items-center gap-2">
                    <Avatar avatarId={avatar.id} size="xl" ring />
                    <span className="text-sm font-medium text-center">{avatar.labelTh}</span>
                    <span className="text-xs text-slate-500">{avatar.label}</span>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          {/* CTA Footer */}
          <section className="text-center">
            <Card variant="glass-strong" padding="lg" className="max-w-2xl mx-auto">
              <h2 className="font-display text-2xl font-bold mb-3">พร้อมเริ่มเกมแล้วหรือยัง?</h2>
              <p className="text-slate-400 mb-6">สร้างห้องได้ทันที ไม่ต้องลงทะเบียน ไม่มีค่าใช้จ่าย</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/join">
                  <Button size="lg" variant="primary" className="w-full sm:w-auto" iconLeft={<Play className="w-5 h-5" />}>
                    เข้าห้องเป็นนักเรียน
                  </Button>
                </Link>
                <Link href="/teacher/login">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto" iconLeft={<Users className="w-5 h-5" />}>
                    สร้างเกมเป็นครู
                  </Button>
                </Link>
              </div>
            </Card>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 py-8 px-4">
        <div className="mx-auto max-w-7xl text-center text-slate-500 text-sm">
          <p>Knowledge Snake — เกมบันไดงูพิชิตความรู้</p>
          <p className="mt-1">Phase 1: Mock Data & UI · Built with Next.js 16, React 19, Tailwind CSS, TypeScript</p>
        </div>
      </footer>
    </div>
  );
}