"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createInitialGameState } from "@/lib/game-state";
import { createProductionTransport, type GameStateTransport } from "@/lib/transport";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { QRCodeSVG } from "@/components/ui/QRCode";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { Avatar } from "@/components/game/Avatar";
import type { GameState } from "@/lib/types";
import {
  Share2,
  Copy,
  Users,
  Sparkles,
  Wifi,
  Play,
  ArrowLeft,
} from "lucide-react";

export default function StudentLobbyPage() {
  const params = useParams<{ pin: string }>();
  const router = useRouter();
  const pin = String(params?.pin || "KS4829").toUpperCase();
  const { toasts, addToast, removeToast } = useToast();

  const [viewerId, setViewerId] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(true);
  const [state, setState] = useState<GameState>(() =>
    createInitialGameState({
      game: {
        id: `game-${pin}`,
        pin,
        title: "Math Challenge",
        subject: "คณิตศาสตร์",
        grade: "มัธยมศึกษา",
        hostName: "ครูผู้สอน",
        school: "โรงเรียนสาธิต",
      },
    }),
  );

  const transportRef = useRef<GameStateTransport | null>(null);
  const [originUrl, setOriginUrl] = useState("http://localhost:3000");

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
  }, []);

  useEffect(() => {
    let playerId: string | null = null;
    try {
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const queryPid = urlParams.get("playerId");
        if (queryPid) playerId = queryPid;
      }
      if (!playerId) {
        const saved =
          sessionStorage.getItem(`ks-room-${pin}`) ||
          sessionStorage.getItem("ks-player");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.playerId) playerId = parsed.playerId;
        }
      }
    } catch {
      // ignore
    }
    setViewerId(playerId);

    const transport = createProductionTransport(pin, state, {
      playerId,
      pollIntervalMs: 1000,
    });
    transportRef.current = transport;
    setConnected(true);

    const unsubscribe = transport.subscribe((newState) => {
      setState(newState);
      if (newState.gameStatus !== "lobby") {
        const query = playerId ? `?playerId=${encodeURIComponent(playerId)}` : "";
        router.push(`/game/${pin}/play${query}`);
      }
    });

    return () => {
      unsubscribe();
      transport.destroy?.();
    };
  }, [pin, router]);

  const handleCopyPin = () => {
    navigator.clipboard?.writeText(pin);
    addToast({
      title: `คัดลอก PIN ${pin} แล้ว`,
      variant: "info",
    });
  };

  const handleShareLink = () => {
    const url = `${originUrl}/join?pin=${pin}`;
    navigator.clipboard?.writeText(url);
    addToast({
      title: "คัดลอกลิงก์เข้าร่วมห้องแล้ว!",
      description: url,
      variant: "success",
    });
  };

  return (
    <div className="min-h-screen bg-[#e9eff8] text-slate-900 font-body flex flex-col">
      {/* Lobby Top Bar (Matches Reference Student Screen #2) */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 shadow-xs">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/join"
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"
              title="กลับหน้าเข้าร่วม"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-display text-lg sm:text-xl font-extrabold text-[#0f2547]">
                ห้องเรียน: {state.game.title}
              </h1>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 mt-0.5">
                <span>
                  PIN: <strong className="font-mono text-blue-700">{pin}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleCopyPin}
                  className="text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  คัดลอก
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Badge variant={connected ? "success" : "warning"} size="md" dot>
              <Wifi className="w-3.5 h-3.5 mr-1" />
              {connected ? "ออนไลน์แล้ว" : "กำลังเชื่อมต่อใหม่..."}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main 3-Column Lobby Layout (Matches Reference Student Screen #2) */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
        <div className="grid lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Card: Player Count + Real QR Code + Share Link */}
          <Card
            variant="default"
            padding="lg"
            className="lg:col-span-3 flex flex-col items-center justify-between text-center space-y-5"
          >
            <div className="space-y-1">
              <span className="text-xs sm:text-sm font-display font-semibold text-slate-500">
                จำนวนผู้เล่น
              </span>
              <div className="font-display text-4xl font-black text-[#0f2547]">
                {state.players.length}/{state.settings.maxPlayers}
              </div>
            </div>

            {pin && (
              <div className="flex flex-col items-center space-y-2">
                <QRCodeSVG value={`${originUrl}/join?pin=${pin}`} size={132} label={`KEY: ${pin}`} />
                <span className="text-xs text-slate-500 font-medium text-center">
                  สแกน QR หรือเข้า <strong>{originUrl}/join</strong>
                </span>
              </div>
            )}

            <Button
              type="button"
              variant="primary"
              size="md"
              fullWidth
              onClick={handleShareLink}
              iconLeft={<Share2 className="w-4 h-4" />}
            >
              แชร์ลิงก์
            </Button>
          </Card>

          {/* Center Card: Player List with Avatar, Nickname, and Status */}
          <Card
            variant="default"
            padding="lg"
            className="lg:col-span-6 flex flex-col space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h2 className="font-display text-lg font-bold text-[#0f2547]">
                  รายชื่อผู้เล่น ({state.players.length} คน)
                </h2>
              </div>
              <Badge variant="primary" size="sm">
                หมวดวิชา: {state.game.subject}
              </Badge>
            </div>

            <div className="grid grid-cols-12 text-xs font-display font-semibold text-slate-400 px-3">
              <span className="col-span-2">ลำดับ</span>
              <span className="col-span-7">ชื่อผู้เล่น</span>
              <span className="col-span-3 text-right">สถานะ</span>
            </div>

            <div className="flex-1 space-y-2 max-h-96 overflow-y-auto pr-1">
              {state.players.map((player, index) => {
                const isMe = player.id === viewerId;
                return (
                  <div
                    key={player.id}
                    className={`grid grid-cols-12 items-center px-3 py-2.5 rounded-2xl border transition-colors ${
                      isMe
                        ? "bg-blue-50/90 border-blue-300 shadow-2xs"
                        : "bg-slate-50/70 border-slate-200/80"
                    }`}
                  >
                    <span className="col-span-2 font-display font-bold text-slate-500 text-sm">
                      {index + 1}
                    </span>
                    <div className="col-span-7 flex items-center gap-2.5 min-w-0">
                      <Avatar avatarId={player.avatarId} size="sm" ring={isMe} />
                      <span className="font-display font-bold text-slate-900 text-sm truncate">
                        {player.name}
                      </span>
                      {isMe && (
                        <Badge variant="primary" size="sm">
                          คุณ
                        </Badge>
                      )}
                    </div>
                    <div className="col-span-3 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-display font-bold bg-emerald-100 text-emerald-700">
                        พร้อม
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Right Card: Waiting for Teacher to Start Game */}
          <Card
            variant="default"
            padding="lg"
            className="lg:col-span-3 flex flex-col items-center justify-center text-center space-y-4 bg-gradient-to-b from-blue-50/60 to-white"
          >
            <div className="w-24 h-24 rounded-full bg-blue-100 border-4 border-white shadow-md flex items-center justify-center text-5xl animate-float-slow">
              👨‍🏫
            </div>
            <div className="space-y-1.5">
              <h2 className="font-display text-xl font-extrabold text-[#0f2547]">
                รอครูเริ่มเกม...
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                เมื่อครูเริ่มเกม คุณจะถูกเปลี่ยนไปยังหน้าเล่นเกมโดยอัตโนมัติ
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-display font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>กำลังรอสัญญาณจากห้อง {pin}</span>
            </div>

            {state.gameStatus !== "lobby" && (
              <Link href={`/game/${pin}/play`} className="w-full pt-2">
                <Button
                  variant="success"
                  size="md"
                  fullWidth
                  iconLeft={<Play className="w-4 h-4" />}
                >
                  เข้าสู่กระดานแข่งขันทันที
                </Button>
              </Link>
            )}
          </Card>
        </div>
      </main>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
