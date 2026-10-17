"use client";

import React, { useEffect } from "react";
import { CheckCircle2, Shield, Zap, Sparkles, Rocket, Magnet, Gift, Trophy } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/game/Avatar";
import { sounds } from "@/lib/audio";
import type { SpecialEventState } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SpecialEventModalProps {
  event: SpecialEventState | null | undefined;
  isOpen: boolean;
  onClose: () => void;
}

export function SpecialEventModal({ event, isOpen, onClose }: SpecialEventModalProps) {
  useEffect(() => {
    if (isOpen && event) {
      if (event.kind === "snake") {
        sounds.playSnake();
      } else if (event.kind === "ladder") {
        sounds.playLadder();
      } else {
        sounds.playItem(event.kind);
      }
    }
  }, [isOpen, event]);

  if (!isOpen || !event) return null;

  const isSnake = event.kind === "snake";
  const isLadder = event.kind === "ladder";
  const isShield = event.kind === "shield";
  const isGem = event.kind === "gem";
  const isRocket = event.kind === "rocket";
  const isMagnet = event.kind === "magnet";
  const isGift = event.kind === "gift";
  const isStar = event.kind === "star";
  const isBoost = event.kind === "boost";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      theme="dark"
      size="sm"
    >
      <div className="relative overflow-hidden text-center space-y-4 px-2 py-3 select-none">
        {/* Dynamic Background Aura Glow */}
        <div
          className={cn(
            "absolute -top-12 left-1/2 -translate-x-1/2 w-52 h-52 rounded-full blur-3xl pointer-events-none opacity-60",
            isSnake && "bg-rose-600/70",
            isLadder && "bg-amber-400/70",
            isShield && "bg-cyan-500/70",
            isGem && "bg-teal-400/70",
            isRocket && "bg-purple-600/70",
            isMagnet && "bg-orange-500/70",
            isGift && "bg-pink-500/70",
            (isStar || isBoost) && "bg-yellow-400/70",
          )}
        />

        {/* Center Graphic Showcase */}
        <div className="relative flex flex-col items-center justify-center pt-2">
          {/* Animated Graphic Icon / Badge */}
          <div className="relative mb-3 flex items-center justify-center">
            {isSnake && (
              <div className="relative animate-bounce">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-rose-600 to-red-900 flex items-center justify-center shadow-[0_0_35px_rgba(225,29,72,0.7)] border-2 border-rose-400">
                  <span className="text-5xl drop-shadow-md">🐍</span>
                </div>
                <span className="absolute -bottom-1 -right-1 text-2xl animate-pulse">⚡</span>
              </div>
            )}

            {isLadder && (
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-700 flex items-center justify-center shadow-[0_0_35px_rgba(245,158,11,0.75)] border-2 border-yellow-300 animate-pulse">
                  <span className="text-5xl drop-shadow-md">🪜</span>
                </div>
                <Sparkles className="w-7 h-7 text-yellow-200 absolute -top-2 -right-2 animate-spin" />
              </div>
            )}

            {isShield && (
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-700 flex items-center justify-center shadow-[0_0_35px_rgba(6,182,212,0.8)] border-2 border-cyan-300">
                  <Shield className="w-12 h-12 text-white animate-pulse" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-cyan-400/60 animate-ping pointer-events-none" />
              </div>
            )}

            {isGem && (
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-300 via-emerald-400 to-cyan-600 flex items-center justify-center shadow-[0_0_35px_rgba(20,184,166,0.8)] border-2 border-teal-200">
                  <span className="text-5xl drop-shadow-md">💎</span>
                </div>
                <Sparkles className="w-7 h-7 text-teal-200 absolute -top-1 -right-1 animate-spin" />
              </div>
            )}

            {isRocket && (
              <div className="relative animate-bounce">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-800 flex items-center justify-center shadow-[0_0_35px_rgba(139,92,246,0.8)] border-2 border-purple-300">
                  <Rocket className="w-12 h-12 text-white" />
                </div>
                <span className="absolute -bottom-2 text-xl">🔥</span>
              </div>
            )}

            {isMagnet && (
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 via-orange-500 to-amber-600 flex items-center justify-center shadow-[0_0_35px_rgba(239,68,68,0.7)] border-2 border-orange-300">
                  <Magnet className="w-12 h-12 text-white animate-pulse" />
                </div>
                <Zap className="w-6 h-6 text-yellow-300 absolute -top-1 -right-1" />
              </div>
            )}

            {isGift && (
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-400 via-rose-500 to-purple-600 flex items-center justify-center shadow-[0_0_35px_rgba(236,72,153,0.8)] border-2 border-pink-300 animate-bounce">
                  <Gift className="w-12 h-12 text-white" />
                </div>
                <span className="absolute -top-1 -right-1 text-2xl animate-spin">✨</span>
              </div>
            )}

            {(isStar || isBoost) && (
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 flex items-center justify-center shadow-[0_0_35px_rgba(251,191,36,0.8)] border-2 border-amber-200">
                  <Zap className="w-12 h-12 text-white animate-pulse" />
                </div>
                <span className="absolute -top-1 -right-1 text-2xl animate-spin">⭐</span>
              </div>
            )}
          </div>

          {/* Player avatar badge */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-white/20 mb-2">
            <Avatar avatarId={event.avatarId} size="xs" ring />
            <span className="font-display font-bold text-white text-sm">{event.playerName}</span>
          </div>

          {/* Event Title */}
          <h3
            className={cn(
              "font-display font-black text-2xl drop-shadow-md",
              isSnake && "text-rose-400",
              isLadder && "text-amber-300",
              isShield && "text-cyan-300",
              isGem && "text-teal-300",
              isRocket && "text-purple-300",
              isMagnet && "text-orange-400",
              isGift && "text-pink-300",
              (isStar || isBoost) && "text-yellow-300",
            )}
          >
            {event.title}
          </h3>

          {/* Event Description */}
          <p className="text-sm sm:text-base text-blue-100 font-medium max-w-sm mt-1 px-2">
            {event.description}
          </p>

          {/* Positional shift pill if movement occurred */}
          {event.from !== event.to && (
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-slate-900/90 border border-blue-400/30 text-xs sm:text-sm font-mono text-white shadow-inner">
              <span>ตำแหน่ง:</span>
              <span className="text-rose-300 font-bold">ช่อง {event.from}</span>
              <span>➔</span>
              <span className="text-emerald-300 font-bold">ช่อง {event.to}</span>
            </div>
          )}
        </div>

        <Button
          variant={isSnake ? "destructive" : isLadder || isStar || isGem ? "gold" : "primary"}
          size="lg"
          fullWidth
          onClick={onClose}
          iconLeft={<CheckCircle2 className="w-5 h-5" />}
          className="shadow-xl"
        >
          รับทราบและลุยต่อ!
        </Button>
      </div>
    </Modal>
  );
}
