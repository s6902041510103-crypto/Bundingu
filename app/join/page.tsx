"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { KnowledgeSnakeLogo } from "@/components/ui/Logo";
import { AvatarPicker } from "@/components/game/Avatar";
import { AVATARS } from "@/lib/game-data";
import type { AvatarId } from "@/lib/types";
import {
  Shuffle,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  Play,
} from "lucide-react";

const PIN_PATTERN = /^\d{6}$/;

function JoinFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPin = searchParams.get("pin") || "";

  const [pin, setPin] = useState(initialPin.replace(/\D/g, "").slice(0, 6));
  const [nickname, setNickname] = useState("");
  const [avatarId, setAvatarId] = useState<AvatarId>("panda");
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const queryPin = searchParams.get("pin");
    if (queryPin) {
      setPin(queryPin.replace(/\D/g, "").slice(0, 6));
    }
    // Restore previous player profile for easy reconnect
    try {
      const saved = sessionStorage.getItem("ks-player");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.nickname) setNickname(parsed.nickname);
        if (parsed.avatarId) setAvatarId(parsed.avatarId);
      }
    } catch {
      // ignore
    }
  }, [searchParams]);

  const handleRandomAvatar = () => {
    const others = AVATARS.filter((a) => a.id !== avatarId);
    const random = others[Math.floor(Math.random() * others.length)] ?? AVATARS[0];
    setAvatarId(random.id);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanPin = pin.trim();
    const cleanName = nickname.trim();

    if (!PIN_PATTERN.test(cleanPin)) {
      setError("กรุณากรอกรหัส Game PIN เป็นตัวเลข 6 หลัก (เช่น 123456)");
      return;
    }
    if (!cleanName) {
      setError("กรุณากรอกชื่อเล่นของคุณก่อนเข้าห้อง");
      return;
    }
    if (cleanName.length > 20) {
      setError("ชื่อเล่นต้องมีความยาวไม่เกิน 20 ตัวอักษร");
      return;
    }

    setIsJoining(true);
    try {
      // Check if we have an existing playerId for this room to support seamless Reconnect
      let existingPlayerId: string | undefined;
      try {
        const existingRoomData = sessionStorage.getItem(`ks-room-${cleanPin}`);
        if (existingRoomData) {
          const parsed = JSON.parse(existingRoomData);
          if (parsed.playerId) existingPlayerId = parsed.playerId;
        }
      } catch {
        // ignore
      }

      const res = await fetch(`/api/games/${encodeURIComponent(cleanPin)}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "JOIN_GAME",
          nickname: cleanName,
          avatarId,
          playerId: existingPlayerId,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || `ไม่พบห้องเกมรหัส PIN ${cleanPin}`);
        setIsJoining(false);
        return;
      }

      const joinedPlayer = data.joinedPlayer || {
        id: existingPlayerId || `p-${Date.now().toString(36)}`,
        name: cleanName,
        avatarId,
      };

      const playerRecord = {
        pin: cleanPin,
        nickname: joinedPlayer.name,
        avatarId: joinedPlayer.avatarId,
        playerId: joinedPlayer.id,
        joinedAt: Date.now(),
      };

      sessionStorage.setItem("ks-player", JSON.stringify(playerRecord));
      sessionStorage.setItem(`ks-room-${cleanPin}`, JSON.stringify(playerRecord));

      if (data.state && data.state.gameStatus !== "lobby") {
        router.push(`/game/${cleanPin}/play`);
      } else {
        router.push(`/game/${cleanPin}`);
      }
    } catch {
      setError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
      setIsJoining(false);
    }
  };

  return (
    <Card variant="elevated" padding="lg" className="w-full max-w-lg rounded-3xl border-white shadow-2xl">
      <div className="text-center mb-5">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0f2547]">
          เข้าร่วมเกม
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          กรุณากรอก Game PIN และเลือกตัวละครของคุณ
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-sm text-red-700 animate-fade-in"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleJoin} className="space-y-4" noValidate>
        {/* Game PIN Input */}
        <div>
          <label
            htmlFor="pin-input"
            className="block font-display text-sm font-bold text-slate-700 mb-1.5"
          >
            Game PIN (6 หลัก)
          </label>
          <input
            id="pin-input"
            type="text"
            inputMode="numeric"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
              if (error) setError("");
            }}
            maxLength={6}
            placeholder="123456"
            disabled={isJoining}
            autoComplete="off"
            className={cn(
              "w-full px-4 py-3 text-center text-2xl font-display font-black tracking-widest rounded-xl border-2 bg-slate-50/70 text-[#0f2547] transition-all",
              "placeholder:text-slate-300 focus:bg-white focus:outline-none focus:border-blue-600",
              error ? "border-red-300" : "border-slate-200",
            )}
          />
        </div>

        {/* Nickname Input */}
        <div>
          <label
            htmlFor="nickname-input"
            className="block font-display text-sm font-bold text-slate-700 mb-1.5"
          >
            ชื่อเล่น (ไม่เกิน 20 ตัวอักษร)
          </label>
          <input
            id="nickname-input"
            type="text"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value.slice(0, 20));
              if (error) setError("");
            }}
            maxLength={20}
            placeholder="เช่น น้องมิน, Panda, Ton"
            disabled={isJoining}
            className={cn(
              "w-full px-4 py-3 text-base rounded-xl border-2 bg-slate-50/70 text-slate-900 transition-all",
              "placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600",
              error ? "border-red-300" : "border-slate-200",
            )}
          />
        </div>

        {/* Avatar Selector + Random Avatar Button (Matches Reference Student Screen #1) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-display text-sm font-bold text-slate-700">
              เลือก Avatar คู่ใจ
            </span>
            <button
              type="button"
              onClick={handleRandomAvatar}
              disabled={isJoining}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-display text-xs font-bold transition-colors cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>สุ่ม Avatar</span>
            </button>
          </div>

          <AvatarPicker
            selectedId={avatarId}
            onSelect={setAvatarId}
            size="md"
            columns={4}
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isJoining}
          iconLeft={<Play className="w-5 h-5 fill-current" />}
          className="py-3.5 text-base shadow-lg shadow-blue-600/25"
        >
          {isJoining ? "กำลังเข้าร่วมห้อง..." : "เข้าร่วมเกม"}
        </Button>
      </form>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>ไม่ต้องสมัครสมาชิก เล่นได้ทันที</span>
      </div>
    </Card>
  );
}

export default function JoinPage() {
  return (
    <div className="min-h-screen flex flex-col bg-adventure-sky text-slate-900 font-body">
      {/* Top Bar */}
      <header className="px-4 sm:px-8 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <KnowledgeSnakeLogo size="md" theme="light" showSubtitle />
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/85 hover:bg-white text-slate-700 font-display text-xs sm:text-sm font-semibold shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>หน้าหลัก</span>
            </Link>
            <Link
              href="/teacher/login"
              className="hidden sm:inline-flex items-center px-4 py-2 rounded-full bg-blue-600/10 hover:bg-blue-600/20 text-blue-800 font-display text-xs sm:text-sm font-semibold"
            >
              สำหรับครูผู้สอน
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-6">
        <Suspense fallback={<div className="p-8 text-center">กำลังโหลด...</div>}>
          <JoinFormContent />
        </Suspense>
      </main>
    </div>
  );
}