"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { KnowledgeSnakeLogo } from "@/components/ui/Logo";
import { AvatarPicker } from "@/components/game/Avatar";
import { QRScannerModal } from "@/components/ui/QRScannerModal";
import { AVATARS } from "@/lib/game-data";
import type { AvatarId } from "@/lib/types";
import {
  Shuffle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Play,
  KeyRound,
  Users,
  CheckCircle2,
  Lock,
  QrCode,
} from "lucide-react";

const ROOM_KEY_PATTERN = /^[A-Z0-9]{6}$/;

function sanitizeRoomKey(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6);
}

interface RoomPublicInfo {
  pin: string;
  title: string;
  subject: string;
  hostName: string;
  players: Array<{ id: string; name: string; avatarId: AvatarId }>;
  maxPlayers: number;
  gameStatus: string;
}

function JoinFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPin = searchParams.get("pin") || "";

  // Step 1: "pin" | Step 2: "profile"
  const [step, setStep] = useState<"pin" | "profile">("pin");
  const [pin, setPin] = useState(sanitizeRoomKey(initialPin));
  const [roomInfo, setRoomInfo] = useState<RoomPublicInfo | null>(null);
  const [isCheckingRoom, setIsCheckingRoom] = useState(false);

  const [nickname, setNickname] = useState("");
  const [avatarId, setAvatarId] = useState<AvatarId>("panda");
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [originUrl, setOriginUrl] = useState("http://localhost:3000");

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoCheckedPinRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOriginUrl(window.location.origin);
      if (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
      ) {
        fetch("/api/network")
          .then((r) => r.json())
          .then((data) => {
            if (data?.lanUrl) {
              setOriginUrl(data.lanUrl);
            }
          })
          .catch(() => {});
      }
    }

    const queryPin = searchParams.get("pin");
    if (queryPin) {
      setPin(sanitizeRoomKey(queryPin));
    }

    // Restore previous player profile for convenience
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

  // Find saved existing playerId for this room if any
  const getExistingPlayerId = (targetPin: string): string | undefined => {
    try {
      const existingRoomData = sessionStorage.getItem(`ks-room-${targetPin}`);
      if (existingRoomData) {
        const parsed = JSON.parse(existingRoomData);
        if (parsed.playerId) return parsed.playerId;
      }
    } catch {
      // ignore
    }
    return undefined;
  };

  // Helper to fetch room state
  const fetchRoomState = async (cleanPin: string): Promise<RoomPublicInfo | null> => {
    try {
      const res = await fetch(`/api/games/${encodeURIComponent(cleanPin)}/state`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.ok || !data.state) return null;

      return {
        pin: cleanPin,
        title: data.state.game?.title || "เกมบันไดงู",
        subject: data.state.game?.subject || "ทั่วไป",
        hostName: data.state.game?.hostName || "ครูผู้สอน",
        players: (data.state.players || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          avatarId: p.avatarId,
        })),
        maxPlayers: data.state.settings?.maxPlayers || 40,
        gameStatus: data.state.gameStatus || "lobby",
      };
    } catch {
      return null;
    }
  };

  // Polling room state when in profile step to keep taken avatars & names up-to-date in real-time
  useEffect(() => {
    if (step === "profile" && roomInfo?.pin) {
      const currentPin = roomInfo.pin;
      pollIntervalRef.current = setInterval(async () => {
        const fresh = await fetchRoomState(currentPin);
        if (fresh) {
          setRoomInfo(fresh);
        }
      }, 2500);

      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      };
    }
  }, [step, roomInfo?.pin]);

  // Core room check logic (used by form submit, QR scanner, and URL ?pin=... auto-join)
  const checkAndEnterRoom = async (rawTargetPin: string) => {
    setError("");
    const cleanPin = sanitizeRoomKey(rawTargetPin);
    setPin(cleanPin);

    if (!ROOM_KEY_PATTERN.test(cleanPin)) {
      setError("กรุณากรอกรหัสห้องเกม (Room PIN) 6 หลัก ตัวอักษรผสมตัวเลข (เช่น KS4829)");
      return;
    }

    setIsCheckingRoom(true);
    try {
      const info = await fetchRoomState(cleanPin);
      if (!info) {
        setError(`ไม่พบห้องเกมรหัส "${cleanPin}" กรุณาตรวจสอบรหัสบนจอครูผู้สอนอีกครั้ง`);
        setIsCheckingRoom(false);
        return;
      }

      setRoomInfo(info);

      // Check current taken avatars in room
      const existingPid = getExistingPlayerId(cleanPin);
      const takenAvatarIdsInRoom = info.players
        .filter((p) => p.id !== existingPid)
        .map((p) => p.avatarId);

      // If current avatarId is already taken, auto-select first available one
      if (takenAvatarIdsInRoom.includes(avatarId)) {
        const firstAvailable = AVATARS.find((a) => !takenAvatarIdsInRoom.includes(a.id));
        if (firstAvailable) {
          setAvatarId(firstAvailable.id);
        }
      }

      // Check if player had a saved nickname for this room
      try {
        const savedRoom = sessionStorage.getItem(`ks-room-${cleanPin}`);
        if (savedRoom) {
          const parsed = JSON.parse(savedRoom);
          if (parsed.nickname) setNickname(parsed.nickname);
          if (parsed.avatarId && !takenAvatarIdsInRoom.includes(parsed.avatarId)) {
            setAvatarId(parsed.avatarId);
          }
        }
      } catch {
        // ignore
      }

      setStep("profile");
      setIsCheckingRoom(false);
    } catch {
      setError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
      setIsCheckingRoom(false);
    }
  };

  // Auto-validate room when user arrives via QR Code URL (/join?pin=XXXXXX)
  useEffect(() => {
    const queryPin = searchParams.get("pin");
    if (queryPin) {
      const cleaned = sanitizeRoomKey(queryPin);
      if (ROOM_KEY_PATTERN.test(cleaned) && autoCheckedPinRef.current !== cleaned) {
        autoCheckedPinRef.current = cleaned;
        checkAndEnterRoom(cleaned);
      }
    }
  }, [searchParams]);

  // Step 1: Submit room PIN to connect to teacher's room
  const handleCheckRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    await checkAndEnterRoom(pin);
  };

  // Calculate taken names & avatars in current room
  const existingPlayerId = roomInfo ? getExistingPlayerId(roomInfo.pin) : undefined;
  const currentPlayers = roomInfo?.players || [];

  const takenNames = currentPlayers
    .filter((p) => p.id !== existingPlayerId)
    .map((p) => p.name.trim().toLowerCase());

  const takenAvatarIds = currentPlayers
    .filter((p) => p.id !== existingPlayerId)
    .map((p) => p.avatarId);

  const takenMap: Record<string, string> = Object.fromEntries(
    currentPlayers
      .filter((p) => p.id !== existingPlayerId)
      .map((p) => [p.avatarId, p.name]),
  );

  const cleanName = nickname.trim();
  const isNameDuplicate = cleanName.length > 0 && takenNames.includes(cleanName.toLowerCase());
  const isAvatarDuplicate = takenAvatarIds.includes(avatarId);

  // Available avatars count
  const availableAvatars = AVATARS.filter((a) => !takenAvatarIds.includes(a.id));

  const handleRandomAvatar = () => {
    if (availableAvatars.length === 0) return;
    const others = availableAvatars.filter((a) => a.id !== avatarId);
    const pool = others.length > 0 ? others : availableAvatars;
    const random = pool[Math.floor(Math.random() * pool.length)];
    if (random) setAvatarId(random.id);
  };

  // Step 2: Join room with nickname & unique avatar
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!roomInfo) {
      setStep("pin");
      return;
    }

    const cleanPin = roomInfo.pin;

    if (!cleanName) {
      setError("กรุณากรอกชื่อเล่นของคุณก่อนเข้าห้อง");
      return;
    }
    if (cleanName.length > 20) {
      setError("ชื่อเล่นต้องมีความยาวไม่เกิน 20 ตัวอักษร");
      return;
    }

    if (isNameDuplicate) {
      setError(`ชื่อเล่น "${cleanName}" มีผู้เล่นคนอื่นในห้องใช้แล้ว กรุณาตั้งชื่ออื่น`);
      return;
    }

    if (isAvatarDuplicate) {
      const takenBy = takenMap[avatarId] || "ผู้เล่นในห้อง";
      setError(`ตัวละครนี้มีเพื่อนในห้องเลือกแล้ว (${takenBy}) กรุณาเลือกตัวละครอื่น`);
      return;
    }

    setIsJoining(true);
    try {
      let res = await fetch(`/api/games/${encodeURIComponent(cleanPin)}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "JOIN_GAME",
          nickname: cleanName,
          avatarId,
          playerId: existingPlayerId,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok || data.error) {
        // Fast retry after 200ms
        await new Promise((r) => setTimeout(r, 200));
        try {
          const retryRes = await fetch(`/api/games/${encodeURIComponent(cleanPin)}/command`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "JOIN_GAME",
              nickname: cleanName,
              avatarId,
              playerId: existingPlayerId,
            }),
          });
          const retryData = await retryRes.json();
          if (retryRes.ok && !retryData.error) {
            res = retryRes;
            data = retryData;
          }
        } catch {
          // ignore
        }
      }

      if (!res.ok || data.error) {
        setError(data.error || `ไม่สามารถเข้าร่วมห้อง ${cleanPin} ได้`);
        setIsJoining(false);
        // Refresh room info to show updated conflict
        const fresh = await fetchRoomState(cleanPin);
        if (fresh) setRoomInfo(fresh);
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

      const playerQuery = `?playerId=${encodeURIComponent(joinedPlayer.id)}`;
      if (data.state && data.state.gameStatus !== "lobby") {
        router.push(`/game/${cleanPin}/play${playerQuery}`);
      } else {
        router.push(`/game/${cleanPin}${playerQuery}`);
      }
    } catch {
      setError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
      setIsJoining(false);
    }
  };

  return (
    <Card variant="elevated" padding="lg" className="w-full max-w-lg rounded-3xl border-white shadow-2xl">
      {/* Header */}
      <div className="text-center mb-5 flex flex-col items-center">
        <KnowledgeSnakeLogo variant="badge" size="md" className="mb-2" />
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0f2547]">
          {step === "pin" ? "เข้าร่วมห้องเกม" : "ตั้งชื่อ & เลือกตัวละคร"}
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">
          {step === "pin"
            ? "กรอกรหัสห้อง 6 หลัก จากหน้าจอครูผู้สอนเพื่อเริ่มต้น"
            : "ชื่อและตัวละครต้องไม่ซ้ำกับเพื่อนในห้องเพื่อระบุตัวตนบนกระดาน"}
        </p>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mt-3 text-xs font-display font-semibold">
          <span
            className={cn(
              "flex items-center gap-1 px-3 py-1 rounded-full transition-colors",
              step === "pin"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-emerald-100 text-emerald-800",
            )}
          >
            {step === "profile" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>1</span>}
            <span>ใส่รหัสห้อง</span>
          </span>
          <span className="text-slate-300">→</span>
          <span
            className={cn(
              "flex items-center gap-1 px-3 py-1 rounded-full transition-colors",
              step === "profile"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-400",
            )}
          >
            <span>2</span>
            <span>ชื่อและตัวละคร</span>
          </span>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-sm text-red-700 animate-fade-in"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span className="leading-snug">{error}</span>
        </div>
      )}

      {/* ================= STEP 1: ENTER PIN ONLY ================= */}
      {step === "pin" && (
        <form onSubmit={handleCheckRoom} className="space-y-4" noValidate>
          <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 border border-blue-200 flex flex-col items-center gap-3">
            <label
              htmlFor="pin-input"
              className="inline-flex items-center gap-1.5 font-display text-sm font-bold text-slate-800 text-center"
            >
              <KeyRound className="w-4 h-4 text-blue-600" />
              <span>รหัสห้องเกม (Room PIN 6 หลัก)</span>
            </label>

            <input
              id="pin-input"
              type="text"
              value={pin}
              onChange={(e) => {
                setPin(sanitizeRoomKey(e.target.value));
                if (error) setError("");
              }}
              maxLength={6}
              placeholder="เช่น KS4829"
              disabled={isCheckingRoom}
              autoFocus
              autoComplete="off"
              className={cn(
                "w-full max-w-xs px-4 py-3.5 text-center text-3xl font-display font-black tracking-[0.25em] uppercase rounded-2xl border-2 bg-white text-[#0f2547] shadow-inner transition-all",
                "placeholder:text-slate-300 placeholder:text-xl placeholder:tracking-normal focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100",
                error ? "border-red-300" : "border-blue-300",
              )}
            />

            <p className="text-xs text-slate-500 text-center">
              ดูรหัสห้อง 6 หลักได้จากหน้าจอโปรเจกเตอร์หรือกระดานของคุณครู
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isCheckingRoom}
            iconRight={<ArrowRight className="w-5 h-5" />}
            className="py-3.5 text-base shadow-lg shadow-blue-600/25 rounded-2xl"
          >
            {isCheckingRoom ? "กำลังตรวจสอบห้องเกม..." : "ตรวจสอบห้อง & ไปต่อ"}
          </Button>

          {/* Divider */}
          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-slate-200" />
            <span className="shrink-0 mx-3 text-xs font-display font-semibold text-slate-400">
              หรือเข้าห้องด้วย QR Code
            </span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          {/* Scan QR Button */}
          <Button
            type="button"
            variant="secondary"
            size="lg"
            fullWidth
            disabled={isCheckingRoom}
            onClick={() => {
              setError("");
              setIsScannerOpen(true);
            }}
            iconLeft={<QrCode className="w-5 h-5 text-blue-600" />}
            className="py-3.5 text-base rounded-2xl border-2 border-blue-200 bg-white hover:bg-blue-50/70 text-[#0f2547] font-display font-bold shadow-xs"
          >
            สแกน QR Code เข้าห้องเกม
          </Button>

          <p className="text-[11px] text-slate-500 text-center">
            สามารถกดปุ่มด้านบนเพื่อสแกน หรือสแกนผ่านแอป <strong>LINE</strong> / กล้องมือถือได้ทันที
          </p>
        </form>
      )}

      {/* QR Scanner Modal */}
      <QRScannerModal
        open={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(scannedPin) => {
          setIsScannerOpen(false);
          checkAndEnterRoom(scannedPin);
        }}
      />

      {/* ================= STEP 2: NICKNAME & CHARACTER ================= */}
      {step === "profile" && roomInfo && (
        <form onSubmit={handleJoin} className="space-y-4" noValidate>
          {/* Room Connected Banner */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200/90 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <span className="font-display font-black text-emerald-950 text-sm">
                    ห้อง {roomInfo.pin}
                  </span>
                  <Badge variant="success" size="sm">
                    {roomInfo.subject}
                  </Badge>
                </div>
                <div className="text-xs text-emerald-800 truncate">
                  {roomInfo.title} · โดย {roomInfo.hostName}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setStep("pin");
                setError("");
              }}
              className="text-xs font-display font-bold text-slate-600 hover:text-blue-700 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors shrink-0 cursor-pointer"
            >
              เปลี่ยนห้อง
            </button>
          </div>

          {/* Current Player Roster Count */}
          <div className="flex items-center justify-between text-xs text-slate-600 px-1">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>มีเพื่อนในห้องแล้ว {currentPlayers.length} คน</span>
            </span>
            <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
              ตัวละครว่าง {availableAvatars.length}/{AVATARS.length} ตัว
            </span>
          </div>

          {/* Nickname Input with Real-time Duplicate Check */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="nickname-input"
                className="block font-display text-sm font-bold text-slate-800"
              >
                ชื่อเล่นของคุณ (1-20 ตัวอักษร)
              </label>
              {isNameDuplicate && (
                <span className="text-xs font-bold text-red-600 flex items-center gap-1 animate-fade-in">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>ชื่อนี้มีเพื่อนในห้องใช้แล้ว</span>
                </span>
              )}
            </div>

            <input
              id="nickname-input"
              type="text"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value.slice(0, 20));
                if (error) setError("");
              }}
              maxLength={20}
              placeholder="เช่น น้องมิน, Ton, Panda"
              disabled={isJoining}
              autoFocus
              className={cn(
                "w-full px-4 py-3 text-base rounded-xl border-2 bg-slate-50/70 text-slate-900 transition-all",
                "placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600",
                isNameDuplicate ? "border-red-400 bg-red-50/40 text-red-900" : "border-slate-200",
              )}
            />
          </div>

          {/* Avatar Selector with Taken Disabled & Randomizer */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-display text-sm font-bold text-slate-800">
                เลือกตัวละครคู่ใจ (ไม่ซ้ำกับเพื่อน)
              </span>
              <button
                type="button"
                onClick={handleRandomAvatar}
                disabled={isJoining || availableAvatars.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-display text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>สุ่มตัวที่ว่าง</span>
              </button>
            </div>

            {isAvatarDuplicate && (
              <div className="mb-2 p-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  ตัวละครที่คุณเลือกถูกเพื่อนในห้องเลือกไปแล้ว กรุณาเลือกตัวละครอื่นที่ยังว่าง
                </span>
              </div>
            )}

            <div className="max-h-64 overflow-y-auto pr-1">
              <AvatarPicker
                selectedId={avatarId}
                onSelect={(id) => {
                  setAvatarId(id);
                  if (error) setError("");
                }}
                disabledIds={takenAvatarIds}
                takenMap={takenMap}
                size="md"
                columns={4}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => {
                setStep("pin");
                setError("");
              }}
              disabled={isJoining}
              className="rounded-2xl px-4 py-3.5"
            >
              ย้อนกลับ
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isJoining}
              disabled={!cleanName || isNameDuplicate || isAvatarDuplicate || isJoining}
              iconLeft={<Play className="w-5 h-5 fill-current" />}
              className="py-3.5 text-base shadow-lg shadow-blue-600/25 rounded-2xl flex-1"
            >
              {isJoining ? "กำลังเข้าสู่ห้องเกม..." : "เข้าสู่ห้องเกม"}
            </Button>
          </div>
        </form>
      )}

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>ระบบตรวจสอบชื่อและตัวละครไม่ให้ซ้ำกันในห้องเรียนโดยอัตโนมัติ</span>
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
        <Suspense fallback={<div className="p-8 text-center text-slate-600">กำลังโหลด...</div>}>
          <JoinFormContent />
        </Suspense>
      </main>
    </div>
  );
}
