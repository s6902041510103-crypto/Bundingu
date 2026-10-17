"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { Crown, Medal } from "lucide-react";
import type { LeaderboardEntry } from "@/lib/types";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  viewerPlayerId?: string | null;
  highlightViewer?: boolean;
  mode?: "full" | "podium" | "compact";
  theme?: "light" | "dark";
  className?: string;
}

export function Leaderboard({
  entries,
  viewerPlayerId,
  highlightViewer = true,
  mode = "full",
  theme = "dark",
  className,
}: LeaderboardProps) {
  if (mode === "podium") {
    const top3 = entries.slice(0, 3);
    return (
      <div
        className={cn(
          "flex items-end justify-center gap-3 sm:gap-6 pt-8 pb-4",
          className,
        )}
        role="list"
        aria-label="โพเดียมผู้ชนะ 3 อันดับแรก"
      >
        {/* 2nd place */}
        {top3[1] && (
          <PodiumStep
            entry={top3[1]}
            rank={2}
            heightClass="h-28 sm:h-36"
            viewerPlayerId={viewerPlayerId}
            highlightViewer={highlightViewer}
          />
        )}
        {/* 1st place */}
        {top3[0] && (
          <PodiumStep
            entry={top3[0]}
            rank={1}
            heightClass="h-36 sm:h-48"
            viewerPlayerId={viewerPlayerId}
            highlightViewer={highlightViewer}
          />
        )}
        {/* 3rd place */}
        {top3[2] && (
          <PodiumStep
            entry={top3[2]}
            rank={3}
            heightClass="h-24 sm:h-28"
            viewerPlayerId={viewerPlayerId}
            highlightViewer={highlightViewer}
          />
        )}
      </div>
    );
  }

  if (mode === "compact") {
    return (
      <div className={cn("space-y-1.5", className)} role="list" aria-label="อันดับผู้เล่น">
        {entries.map((entry, index) => {
          const rank = index + 1;
          const isViewer = highlightViewer && entry.playerId === viewerPlayerId;
          return (
            <div
              key={entry.playerId}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-colors text-sm",
                theme === "dark"
                  ? isViewer
                    ? "bg-emerald-500/20 border-emerald-400/50 text-white"
                    : "bg-slate-900/65 border-white/10 text-slate-100"
                  : isViewer
                  ? "bg-blue-50 border-blue-300 text-blue-950"
                  : "bg-white border-slate-200 text-slate-800",
              )}
              role="listitem"
            >
              <span
                className={cn(
                  "font-display font-bold w-6 text-center",
                  rank === 1
                    ? "text-amber-400"
                    : rank === 2
                    ? "text-slate-300"
                    : rank === 3
                    ? "text-amber-600"
                    : "text-slate-400",
                )}
              >
                {rank}
              </span>
              <Avatar avatarId={entry.avatarId} size="xs" />
              <span className="font-display font-semibold truncate flex-1">
                {entry.name}
                {isViewer && " (คุณ)"}
              </span>
              <span className="font-mono font-bold text-amber-400">{entry.score}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Full mode
  return (
    <div className={cn("space-y-2", className)} role="list" aria-label="อันดับผู้เล่นทั้งหมด">
      {entries.map((entry, index) => {
        const rank = index + 1;
        const isViewer = highlightViewer && entry.playerId === viewerPlayerId;
        return (
          <div
            key={entry.playerId}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all",
              theme === "dark"
                ? isViewer
                  ? "bg-emerald-500/20 border-emerald-400 text-white"
                  : "bg-slate-900/60 border-white/10 text-white"
                : isViewer
                ? "bg-blue-50 border-blue-400 text-slate-900"
                : "bg-white border-slate-200 text-slate-900",
            )}
            role="listitem"
          >
            <div className="w-8 flex items-center justify-center font-display font-bold">
              {rank === 1 ? (
                <Crown className="w-5 h-5 text-amber-400" />
              ) : rank === 2 ? (
                <Medal className="w-5 h-5 text-slate-400" />
              ) : rank === 3 ? (
                <Medal className="w-5 h-5 text-amber-600" />
              ) : (
                <span>{rank}</span>
              )}
            </div>
            <Avatar avatarId={entry.avatarId} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold truncate">
                {entry.name} {isViewer && <span className="text-xs text-emerald-400">(คุณ)</span>}
              </p>
              <p className="text-xs opacity-75">ช่องที่ {entry.position}</p>
            </div>
            <div className="text-right font-display font-extrabold text-amber-500">
              {entry.score} <span className="text-xs font-normal opacity-75">คะแนน</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PodiumStep({
  entry,
  rank,
  heightClass,
  viewerPlayerId,
  highlightViewer,
}: {
  entry: LeaderboardEntry;
  rank: 1 | 2 | 3;
  heightClass: string;
  viewerPlayerId?: string | null;
  highlightViewer?: boolean;
}) {
  const isViewer = highlightViewer && entry.playerId === viewerPlayerId;
  const styles = {
    1: "from-amber-300 via-amber-400 to-amber-500 border-amber-200 text-amber-950",
    2: "from-slate-200 via-slate-300 to-slate-400 border-slate-100 text-slate-900",
    3: "from-orange-300 via-amber-600 to-amber-700 border-orange-200 text-white",
  }[rank];

  return (
    <div className="flex flex-col items-center w-24 sm:w-32">
      <div className="relative mb-2 flex flex-col items-center">
        {rank === 1 && (
          <Crown className="w-7 h-7 text-amber-400 -mb-1 animate-bounce-in drop-shadow" />
        )}
        <Avatar
          avatarId={entry.avatarId}
          size={rank === 1 ? "xl" : "lg"}
          ring
          className={cn(isViewer && "ring-4 ring-emerald-400")}
        />
        <span className="mt-1.5 font-display font-bold text-xs sm:text-sm truncate max-w-[100px] text-center">
          {entry.name}
        </span>
        <span className="text-xs font-mono font-bold text-amber-600">
          {entry.score} คะแนน
        </span>
      </div>
      <div
        className={cn(
          "w-full rounded-t-2xl border-t-4 bg-gradient-to-b flex flex-col items-center justify-center shadow-lg",
          styles,
          heightClass,
        )}
      >
        <span className="font-display font-black text-3xl sm:text-4xl drop-shadow-xs">
          {rank}
        </span>
      </div>
    </div>
  );
}