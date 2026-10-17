"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { KnowledgeSnakeLogo } from "@/components/ui/Logo";
import { Avatar } from "@/components/game/Avatar";
import { GameBoardWrapper } from "@/components/game/GameBoard";
import { Dice } from "@/components/game/Dice";
import { MOCK_PLAYERS, AVATARS } from "@/lib/game-data";
import {
  Play,
  Users,
  Zap,
  Trophy,
  Shield,
  Sparkles,
  LogIn,
  BookOpen,
  Monitor,
} from "lucide-react";

const HOW_TO_PLAY = [
  {
    step: 1,
    title: "ครูสร้างห้องเกม",
    desc: "ตั้งชื่อเกม เลือกรายวิชา ชุดคำถาม จำนวนรอบ และรับ Game PIN พร้อม QR Code ทันที",
    icon: BookOpen,
  },
  {
    step: 2,
    title: "นักเรียนเข้าร่วมด้วย PIN",
    desc: "กรอก PIN 6 หลัก ตั้งชื่อเล่น เลือก Avatar สัตว์คู่ใจ เข้าห้องได้ทันทีไม่ต้องสมัครสมาชิก",
    icon: Users,
  },
  {
    step: 3,
    title: "ตอบคำถามและทอยลูกเต๋า",
    desc: "ตอบคำถามให้ถูกต้องและรวดเร็วเพื่อเข้าคิวทอยลูกเต๋า เดินหน้าบนกระดาน 100 ช่อง",
    icon: Zap,
  },
  {
    step: 4,
    title: "พิชิตเส้นชัยช่องที่ 100",
    desc: "ปีนบันไดลัดขึ้นข้างบน ระวังงูดึงลงข้างล่าง ลุ้นช่องโบนัสพิเศษ และชิงอันดับบนโพเดียม!",
    icon: Trophy,
  },
];

export default function HomePage() {
  const previewPlayers = MOCK_PLAYERS.slice(0, 6);

  return (
    <div className="min-h-screen flex flex-col bg-adventure-sky text-slate-900 font-body">
      {/* Top Royal Blue Header Bar (matches screen #1 in reference) */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-[#133b8a] via-[#1b5de0] to-[#133b8a] text-white shadow-lg border-b border-blue-400/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 sm:h-18 items-center justify-between gap-4">
            <KnowledgeSnakeLogo size="md" theme="dark" showSubtitle />

            <nav className="hidden md:flex items-center gap-7 text-sm font-display font-medium text-blue-100">
              <Link href="/" className="text-white font-semibold hover:text-amber-300 transition-colors">
                หน้าหลัก
              </Link>
              <Link href="/join" className="hover:text-amber-300 transition-colors">
                จอยเกม
              </Link>
              <Link href="/teacher/games/new" className="hover:text-amber-300 transition-colors">
                สร้างเกม
              </Link>
              <Link href="/game/KS4829/projector" className="hover:text-amber-300 transition-colors">
                Projector View
              </Link>
            </nav>

            <div className="flex items-center gap-2.5">
              <Link href="/teacher/register" className="hidden sm:block">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/15 rounded-full px-3.5 py-2 text-xs sm:text-sm"
                >
                  สมัครบัญชีครู
                </Button>
              </Link>
              <Link href="/teacher/login">
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-blue-500/30 hover:bg-blue-500/50 border border-white/40 rounded-full px-4 py-2 text-xs sm:text-sm"
                  iconLeft={<LogIn className="w-4 h-4" />}
                >
                  เข้าสู่ระบบครู
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section — Educational Fantasy Adventure */}
      <main className="flex-1">
        <section className="relative overflow-hidden py-10 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-8 items-center">
              {/* Left Column: Headline & Primary CTAs */}
              <div className="lg:col-span-6 text-center lg:text-left space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/85 border border-blue-200 shadow-xs text-blue-800 text-xs sm:text-sm font-display font-semibold">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Educational Fantasy Adventure · Kahoot × Snake & Ladder</span>
                </div>

                <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#0f2547] leading-[1.15] drop-shadow-xs">
                  เกมบันไดงู
                  <br />
                  <span className="text-[#1554d1]">พิชิตความรู้</span>
                </h1>

                <p className="font-display text-lg sm:text-xl font-semibold text-slate-700">
                  เรียนรู้ • เล่นสนุก • สร้างการมีส่วนร่วม
                </p>

                <p className="text-slate-700 text-sm sm:text-base max-w-xl mx-auto lg:mx-0 leading-relaxed">
                  เปลี่ยนห้องเรียนให้เป็นการผจญภัยบนกระดาน 100 ช่อง! ครูสร้างห้องและควบคุมจังหวะคำถามแบบสด
                  นักเรียนเข้าห้องด้วยคีย์ห้องหรือ QR Code ตอบคำถามเพื่อรับสิทธิ์ทอยลูกเต๋า ปีนบันได หลบงู และสะสมคะแนนสู่เส้นชัย
                </p>

                {/* Primary Hero Buttons matching Reference Image #1 */}
                <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3.5 pt-2 max-w-md mx-auto lg:mx-0">
                  <Link href="/teacher/games/new" className="w-full sm:w-auto flex-1">
                    <Button
                      size="xl"
                      variant="primary"
                      fullWidth
                      className="rounded-2xl shadow-xl shadow-blue-700/25 py-4 text-base sm:text-lg"
                    >
                      สร้างเกม (สำหรับครู)
                    </Button>
                  </Link>
                  <Link href="/join" className="w-full sm:w-auto flex-1">
                    <Button
                      size="xl"
                      variant="success"
                      fullWidth
                      className="rounded-2xl shadow-xl shadow-emerald-700/25 py-4 text-base sm:text-lg"
                    >
                      จอยเกม (สำหรับนักเรียน)
                    </Button>
                  </Link>
                </div>

                {/* Quick highlights */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2 text-xs sm:text-sm font-medium text-slate-700">
                  <span className="inline-flex items-center gap-1.5 bg-white/75 px-3 py-1.5 rounded-full border border-white">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    ไม่ต้องสมัครบัญชีผู้เรียน
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-white/75 px-3 py-1.5 rounded-full border border-white">
                    <Users className="w-4 h-4 text-blue-600" />
                    รองรับสูงสุด 40 คน/ห้อง
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-white/75 px-3 py-1.5 rounded-full border border-white">
                    <Monitor className="w-4 h-4 text-amber-600" />
                    พร้อมโหมดฉายขึ้นจอ Projector
                  </span>
                </div>
              </div>

              {/* Right Column: Adventure Characters & Live Interactive Board Preview */}
              <div className="lg:col-span-6">
                <div className="relative mx-auto max-w-lg">
                  {/* Decorative Character Mascot Banner */}
                  <div className="flex items-center justify-between bg-white/90 backdrop-blur-md px-4 py-3 rounded-t-3xl border border-b-0 border-white shadow-lg">
                    <div className="flex items-center gap-2">
                      <Avatar avatarId="fox" size="md" ring />
                      <Avatar avatarId="panda" size="lg" ring />
                      <Avatar avatarId="tiger" size="md" ring />
                      <Avatar avatarId="rabbit" size="sm" />
                      <Avatar avatarId="frog" size="sm" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success" dot>
                        KEY: KS4829
                      </Badge>
                      <Dice value={6} size="sm" className="w-10 h-10" />
                    </div>
                  </div>

                  {/* Interactive Real 10x10 Board Preview */}
                  <div className="bg-white/90 backdrop-blur-md p-3 sm:p-4 rounded-b-3xl border border-white shadow-2xl">
                    <GameBoardWrapper
                      players={previewPlayers}
                      mode="preview"
                      highlightCell={25}
                    />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 px-1">
                      <span className="font-display font-semibold text-slate-800">
                        🎲 กระดานจริง 10×10 (100 ช่อง) · งู 4 ตัว · บันได 4 ตัว
                      </span>
                      <div className="flex items-center gap-2">
                        <Link
                          href="/teacher/dashboard"
                          className="text-blue-600 hover:underline font-semibold"
                        >
                          แดชบอร์ดครู →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How to Play Section */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white/75 backdrop-blur-xs border-t border-white/80">
          <div className="mx-auto max-w-7xl">
            <div className="text-center mb-10">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0f2547]">
                วิธีเล่น Knowledge Snake 4 ขั้นตอน
              </h2>
              <p className="text-slate-600 text-sm sm:text-base mt-1">
                ออกแบบมาเพื่อห้องเรียนยุคใหม่ ใช้งานง่ายทั้งคุณครูและนักเรียน
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {HOW_TO_PLAY.map(({ step, title, desc, icon: Icon }) => (
                <Card key={step} variant="elevated" padding="md" className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-display font-bold text-sm flex items-center justify-center">
                      {step}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-base text-slate-900 mb-1.5">
                    {title}
                  </h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">{desc}</p>
                </Card>
              ))}
            </div>

            {/* Animal Avatars Roster */}
            <div className="mt-12 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
                <div>
                  <h3 className="font-display text-lg font-bold text-[#0f2547]">
                    ตัวละครสัตว์คู่ใจทั้ง 12 ตัว (Animal Avatars)
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500">
                    ชุดตัวละครเดียวกันทั้งระบบ แสดงผลชัดเจนบนกระดาน รายชื่อผู้เล่น และโพเดียมผู้ชนะ
                  </p>
                </div>
                <Link href="/join">
                  <Button variant="outline" size="sm" iconLeft={<Play className="w-4 h-4" />}>
                    เลือกตัวละครเข้าเล่น
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-3">
                {AVATARS.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-slate-50 border border-slate-100"
                  >
                    <Avatar avatarId={a.id} size="md" ring />
                    <span className="text-xs font-display font-semibold text-slate-700 truncate max-w-full">
                      {a.labelTh}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#0f2547] text-blue-100 py-6 px-4 border-t border-blue-900">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm">
          <KnowledgeSnakeLogo size="sm" theme="dark" />
          <p className="text-blue-200/80 text-center sm:text-right">
            Knowledge Snake — เกมบันไดงูพิชิตความรู้ · พัฒนาด้วย Next.js, TypeScript และ Tailwind CSS
          </p>
        </div>
      </footer>
    </div>
  );
}