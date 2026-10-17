"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Avatar, AvatarPicker } from "@/components/game/Avatar";
import { AVATARS } from "@/lib/game-data";
import { ArrowRight, User, Dice1, Shield, AlertCircle } from "lucide-react";

const PIN_PATTERN = /^\d{6}$/;

export default function JoinPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [nickname, setNickname] = useState("");
  const [avatarId, setAvatarId] = useState<typeof AVATARS[0]["id"]>("fox");
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Auto-focus first input
  useEffect(() => {
    const input = document.getElementById("pin-input");
    input?.focus();
  }, []);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setPin(value);
    if (error) setError("");
  };

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, 20);
    setNickname(value);
    if (error) setError("");
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!PIN_PATTERN.test(pin)) {
      setError("PIN ต้องเป็นตัวเลข 6 หลัก");
      return;
    }
    if (!nickname.trim()) {
      setError("กรุณาใส่ชื่อเล่น");
      return;
    }

    setIsJoining(true);

    // Simulate join delay
    await new Promise((r) => setTimeout(r, 800));

    // Store in sessionStorage for mock persistence
    const playerData = {
      pin,
      nickname: nickname.trim(),
      avatarId,
      playerId: `p-${Date.now().toString(36)}`,
      joinedAt: Date.now(),
    };
    sessionStorage.setItem("ks-player", JSON.stringify(playerData));
    sessionStorage.setItem(`ks-room-${pin}`, JSON.stringify(playerData));

    setIsJoining(false);
    router.push(`/game/lobby?pin=${pin}`);
  };

  const handleRandomAvatar = () => {
    const random = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    setAvatarId(random.id);
  };

  return (
    <div className="min-h-screen bg-bg-deep text-foreground font-body flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm font-medium mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          กลับหน้าแรก
        </Link>

        {/* Join Card */}
        <Card variant="glass-strong" padding="lg">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 mb-4">
              <Dice1 className="w-8 h-8 text-slate-950" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-2">เข้าร่วมเกม</h1>
            <p className="text-slate-400">ใส่ PIN ที่ครูให้มา ใส่ชื่อเล่น เล่นได้ทันที</p>
          </div>

          {/* Features */}
          <div className="flex items-center justify-center gap-6 mb-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>ไม่ต้องสมัครสมาชิก</span>
            </div>
            <div className="w-px h-6 bg-slate-700" />
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <User className="w-4 h-4 text-sky-400" />
              <span>เล่นได้ทันที</span>
            </div>
            <div className="w-px h-6 bg-slate-700" />
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <Dice1 className="w-4 h-4 text-amber-400" />
              <span>Multiplayer จริง</span>
            </div>
          </div>

          <form onSubmit={handleJoin} className="space-y-5">
            {/* PIN Input */}
            <div>
              <label htmlFor="pin-input" className="block text-sm font-medium text-slate-300 mb-2">
                Game PIN <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="pin-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pin}
                  onChange={handlePinChange}
                  maxLength={6}
                  placeholder="123456"
                  disabled={isJoining}
                  className={cn(
                    "w-full px-4 py-3.5 text-center text-2xl font-display font-bold tracking-widest",
                    "bg-slate-800 border-2 rounded-xl transition-all duration-200",
                    "placeholder:text-slate-600",
                    "focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    error ? "border-red-500 bg-red-500/5" : "border-slate-700 hover:border-slate-600",
                  )}
                  autoComplete="off"
                  aria-describedby={error ? "pin-error" : undefined}
                />
              </div>
              {error && (
                <p id="pin-error" className="mt-1.5 flex items-center gap-1.5 text-sm text-red-400" role="alert">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </p>
              )}
            </div>

            {/* Nickname Input */}
            <div>
              <label htmlFor="nickname-input" className="block text-sm font-medium text-slate-300 mb-2">
                ชื่อเล่น <span className="text-amber-400">*</span>
              </label>
              <input
                id="nickname-input"
                type="text"
                value={nickname}
                onChange={handleNicknameChange}
                maxLength={20}
                placeholder="เช่น Mew, Bank, Ton"
                disabled={isJoining}
                className={cn(
                  "w-full px-4 py-3 text-base",
                  "bg-slate-800 border-2 rounded-xl transition-all duration-200",
                  "placeholder:text-slate-600",
                  "focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  error ? "border-red-500 bg-red-500/5" : "border-slate-700 hover:border-slate-600",
                )}
                autoComplete="nickname"
              />
            </div>

            {/* Avatar Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                อวตาร์ <span className="text-amber-400">*</span>
              </label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(true)}
                  disabled={isJoining}
                  className={cn(
                    "relative flex-shrink-0 w-16 h-16 rounded-2xl border-2 transition-all duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
                    "hover:scale-105 active:scale-95",
                    isJoining && "opacity-50 cursor-not-allowed",
                  )}
                  style={{
                    background: `linear-gradient(135deg, ${AVATARS.find(a => a.id === avatarId)?.primary} 0%, ${AVATARS.find(a => a.id === avatarId)?.secondary} 100%)`,
                    borderColor: AVATARS.find(a => a.id === avatarId)?.ring,
                    color: AVATARS.find(a => a.id === avatarId)?.accent,
                  } as React.CSSProperties}
                  aria-label={`อวตาร์ปัจจุบัน: ${AVATARS.find(a => a.id === avatarId)?.labelTh}`}
                >
                  <span className="text-3xl" role="img" aria-hidden="true">
                    {AVATARS.find(a => a.id === avatarId)?.emoji}
                  </span>
                </button>
                <div className="flex-1 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleRandomAvatar}
                    disabled={isJoining}
                    className={cn(
                      "px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200",
                      "bg-slate-800 border border-slate-700 text-slate-300",
                      "hover:bg-slate-700 hover:border-slate-600 hover:text-white",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      สุ่มอวตาร์ใหม่
                    </span>
                  </button>
                  <p className="text-xs text-slate-500">
                    {AVATARS.find(a => a.id === avatarId)?.labelTh} — {AVATARS.find(a => a.id === avatarId)?.label}
                  </p>
                </div>
              </div>
            </div>

            {/* Join Button */}
            <Button
              type="submit"
              disabled={isJoining || !PIN_PATTERN.test(pin) || !nickname.trim()}
              variant="primary"
              size="lg"
              fullWidth
              className="py-3.5 text-lg"
              loading={isJoining}
            >
              {isJoining ? "กำลังเข้าห้อง..." : "เข้าร่วมเกม"}
              <ArrowRight className="w-5 h-5" />
            </Button>
          </form>

          {/* Help text */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-center text-sm text-slate-500">
              ไม่มี PIN? <Link href="/teacher/login" className="text-amber-400 hover:underline font-medium">สร้างเกมเอง</Link>
            </p>
          </div>
        </Card>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Knowledge Snake Phase 1 — Mock Data Only
        </p>
      </div>

      {/* Avatar Picker Modal */}
      {showAvatarPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowAvatarPicker(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="avatar-picker-title"
        >
          <Card variant="glass-strong" padding="lg" className="w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 id="avatar-picker-title" className="font-display text-xl font-bold">เลือกอวตาร์</h2>
              <button
                onClick={() => setShowAvatarPicker(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
                aria-label="ปิด"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-slate-400 text-sm mb-4">เลือกอวตาร์ที่ชอบ จะเปลี่ยนได้เฉพาะตอนเข้าห้องเท่านั้น</p>
            <AvatarPicker
              selectedId={avatarId}
              onSelect={(id) => {
                setAvatarId(id);
                setShowAvatarPicker(false);
              }}
              size="lg"
              columns={4}
            />
          </Card>
        </div>
      )}
    </div>
  );
}