"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { Trophy, Crown, Medal, Sparkles } from "lucide-react";
import type { LeaderboardEntry } from "@/lib/types";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  viewerPlayerId?: string | null;
  highlightViewer?: boolean;
  mode?: "full" | "podium" | "compact";
  className?: string;
}

export function Leaderboard({
  entries,
  viewerPlayerId,
  highlightViewer = true,
  mode = "full",
  className,
}: LeaderboardProps) {
  if (mode === "podium") {
    const top3 = entries.slice(0, 3);
    return (
      <div className={cn("flex items-end justify-center gap-4 pb-8", className)} role="list" aria-label="พודיัมผู้ชนะ">
        {/* 2nd place */}
        {top3[1] && (
          <PodiumPlace
            entry={top3[1]}
            rank={2}
            height={200}
            viewerPlayerId={viewerPlayerId}
            highlightViewer={highlightViewer}
          />
        )}
        {/* 1st place */}
        {top3[0] && (
          <PodiumPlace
            entry={top3[0]}
            rank={1}
            height={280}
            viewerPlayerId={viewerPlayerId}
            highlightViewer={highlightViewer}
          />
        )}
        {/* 3rd place */}
        {top3[2] && (
          <PodiumPlace
            entry={top3[2]}
            rank={3}
            height={140}
            viewerPlayerId={viewerPlayerId}
            highlightViewer={highlightViewer}
          />
        )}
      </div>
    );
  }

  if (mode === "compact") {
    return (
      <div className={cn("space-y-2", className)} role="list" aria-label="อันดับผู้เล่น">
        {entries.map((entry, index) => (
          <CompactLeaderboardRow key={entry.playerId} entry={entry} rank={index + 1} viewerPlayerId={viewerPlayerId} />
        ))}
      </div>
    );
  }

  // Full mode
  return (
    <div className={cn("space-y-2", className)} role="list" aria-label="อันดับผู้เล่น">
      {/* Top 3 with special styling */}
      {entries.slice(0, 3).map((entry, index) => (
        <LeaderboardRow
          key={entry.playerId}
          entry={entry}
          rank={index + 1}
          isTop3
          viewerPlayerId={viewerPlayerId}
          highlightViewer={highlightViewer}
        />
      ))}
      {/* Rest of the players */}
      {entries.slice(3).map((entry, index) => (
        <LeaderboardRow
          key={entry.playerId}
          entry={entry}
          rank={index + 4}
          viewerPlayerId={viewerPlayerId}
          highlightViewer={highlightViewer}
        />
      ))}
    </div>
  );
}

interface PodiumPlaceProps {
  entry: LeaderboardEntry;
  rank: 1 | 2 | 3;
  height: number;
  viewerPlayerId?: string | null;
  highlightViewer?: boolean;
}

function PodiumPlace({ entry, rank, height, viewerPlayerId, highlightViewer }: PodiumPlaceProps) {
  const isViewer = highlightViewer && entry.playerId === viewerPlayerId;
  const colors = {
    1: { bg: "from-amber-400 to-amber-500", text: "text-amber-500", glow: "shadow-amber-400/40" },
    2: { bg: "from-slate-300 to-slate-400", text: "text-slate-400", glow: "shadow-slate-400/40" },
    3: { bg: "from-amber-700 to-amber-800", text: "text-amber-700", glow: "shadow-amber-700/40" },
  };
  const icons = {
    1: <Crown className="w-10 h-10 text-white/90" />,
    2: <Medal className="w-10 h-10 text-white/90" />,
    3: <Medal className="w-10 h-10 text-white/90" />,
  };

  const c = colors[rank];

  return (
    <div
      className={cn(
        "flex flex-col items-center relative",
        "filter drop-shadow-lg",
        isViewer && "ring-2 ring-emerald-400",
      )}
      role="listitem"
      aria-label={`อันดับที่ ${rank} ${entry.name}`}
    >
      {/* Trophy/Icon */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-10">
        <div
          className={cn(
            "w-20 h-20 rounded-2xl flex items-center justify-center",
            `bg-gradient-to-br ${c.bg}`,
            c.glow,
            "animate-bounce-in",
          )}
        >
          {icons[rank]}
        </div>
      </div>

      {/* Pedestal */}
      <div
        className={cn(
          "w-40 rounded-t-2xl flex flex-col items-center justify-end p-4",
          `bg-gradient-to-t ${c.bg}`,
          "shadow-2xl",
        )}
        style={{ height }}
      >
        <Avatar avatarId={entry.avatarId} size="xl" ring />
        <div className="mt-3 text-center">
          <p className="font-display font-bold text-white text-lg truncate w-full px-2">{entry.name}</p>
          <p className="text-white/80 text-sm font-mono mt-1">คะแนน: {entry.score}</p>
          {entry.isFinished && <p className="text-emerald-300 text-xs mt-1">🏁 เข้าชัย</p>}
        </div>
        {isViewer && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2">
            <span className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-full font-medium animate-bounce-in">
              คุณ
            </span>
          </div>
        )}
      </div>

      {/* Rank label */}
      <div className="mt-3 text-center">
        <span className={cn("font-display font-bold text-2xl", c.text)}>#{rank}</span>
      </div>
    </div>
  );
}

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  rank: number;
  isTop3?: boolean;
  viewerPlayerId?: string | null;
  highlightViewer?: boolean;
}

function LeaderboardRow({
  entry,
  rank,
  isTop3 = false,
  viewerPlayerId,
  highlightViewer,
}: LeaderboardRowProps) {
  const isViewer = highlightViewer && entry.playerId === viewerPlayerId;
  const rankColors = {
    1: "text-amber-400",
    2: "text-slate-400",
    3: "text-amber-700",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
        isTop3
          ? "bg-gradient-to-r from-amber-400/5 to-transparent border-amber-400/30 shadow-lg shadow-amber-400/10"
          : "bg-slate-800/50 border-slate-700",
        isViewer && "ring-2 ring-emerald-400 bg-emerald-500/5",
      )}
      role="listitem"
    >
      <div className="flex items-center justify-center w-12 h-12 flex-shrink-0">
        {isTop3 && rank <= 3 && (
          <>
            {rank === 1 && <Crown className="w-7 h-7 text-amber-400" />}
            {rank === 2 && <Medal className="w-7 h-7 text-slate-400" />}
            {rank === 3 && <Medal className="w-7 h-7 text-amber-700" />}
          </>
        )}
        {!isTop3 && (
          <span className="font-display font-bold text-slate-400 text-lg">#{rank}</span>
        )}
      </div>

      <Avatar avatarId={entry.avatarId} size="md" ring />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{entry.name}</span>
          {isViewer && (
            <span className="text-xs px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full animate-bounce-in">
              คุณ
            </span>
          )}
          {entry.isFinished && (
            <span className="text-xs px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              เข้าชัย #{entry.rank}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400 mt-0.5">
          <span>ตำแหน่ง: <span className="font-mono text-white">{entry.position}</span></span>
          <span>คะแนน: <span className="font-mono text-amber-400">{entry.score}</span></span>
        </div>
      </div>

      <div className="text-right flex-shrink-0 w-24">
        <div className={cn("font-display font-bold text-lg", rankColors[rank as 1 | 2 | 3] || "text-amber-400")}>
          {entry.score}
        </div>
        <div className="text-xs text-slate-500">pts</div>
      </div>
    </div>
  );
}

interface CompactLeaderboardRowProps {
  entry: LeaderboardEntry;
  rank: number;
  viewerPlayerId?: string | null;
}

function CompactLeaderboardRow({ entry, rank, viewerPlayerId }: CompactLeaderboardRowProps) {
  const isViewer = entry.playerId === viewerPlayerId;
  const rankColors = {
    1: "text-amber-400",
    2: "text-slate-400",
    3: "text-amber-700",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg transition-colors",
        isViewer ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-slate-800/50 border border-slate-700",
      )}
      role="listitem"
    >
      <span className={cn("font-display font-bold w-8 text-center", rankColors[rank as 1 | 2 | 3] || "text-slate-400")}>
        #{rank}
      </span>
      <Avatar avatarId={entry.avatarId} size="xs" ring />
      <span className="font-medium truncate flex-1">{entry.name}</span>
      <span className="font-mono text-amber-400 text-sm">{entry.score}</span>
      {isViewer && <span className="text-emerald-400 text-xs">(คุณ)</span>}
    </div>
  );
}