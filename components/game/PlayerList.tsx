"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import type { Player } from "@/lib/types";
import { Trophy, Crown, Medal } from "lucide-react";

interface PlayerListProps {
  players: Player[];
  currentPlayerId?: string | null;
  viewerPlayerId?: string | null;
  mode?: "compact" | "full" | "leaderboard";
  maxVisible?: number;
  showScore?: boolean;
  showPosition?: boolean;
  className?: string;
}

export function PlayerList({
  players,
  currentPlayerId,
  viewerPlayerId,
  mode = "full",
  maxVisible,
  showScore = true,
  showPosition = true,
  className,
}: PlayerListProps) {
  const sortedPlayers = React.useMemo(() => {
    return [...players].sort((a, b) => {
      if (a.finishRank && b.finishRank) return a.finishRank - b.finishRank;
      if (a.finishRank) return -1;
      if (b.finishRank) return 1;
      return b.position - a.position;
    });
  }, [players]);

  const visiblePlayers = maxVisible ? sortedPlayers.slice(0, maxVisible) : sortedPlayers;

  const rankIcons = {
    1: <Crown className="w-5 h-5 text-amber-400" />,
    2: <Medal className="w-5 h-5 text-slate-400" />,
    3: <Medal className="w-5 h-5 text-amber-700" />,
  };

  if (mode === "compact") {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)} role="list" aria-label="ผู้เล่น">
        {visiblePlayers.map((player, index) => (
          <div
            key={player.id}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700",
              "transition-all duration-200",
              player.id === currentPlayerId && "ring-2 ring-sky-400 bg-sky-500/10",
              player.id === viewerPlayerId && "ring-2 ring-emerald-400 bg-emerald-500/10",
            )}
            role="listitem"
          >
            <Avatar avatarId={player.avatarId} size="xs" ring />
            <span className="text-xs font-medium truncate max-w-[80px]">{player.name}</span>
            {showPosition && (
              <span className="text-xs text-slate-400 font-mono">#{player.position}</span>
            )}
          </div>
        ))}
        {sortedPlayers.length > (maxVisible || 0) && (
          <span className="px-2 py-1 text-xs text-slate-500">
            +{sortedPlayers.length - (maxVisible || 0)} คน
          </span>
        )}
      </div>
    );
  }

  if (mode === "leaderboard") {
    return (
      <div className={cn("space-y-2", className)} role="list" aria-label="อันดับผู้เล่น">
        {visiblePlayers.map((player, index) => {
          const rank = index + 1;
          const isTop3 = rank <= 3;
          return (
            <div
              key={player.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
                "bg-slate-800/50 border",
                isTop3
                  ? "border-amber-400/30 bg-gradient-to-r from-amber-400/5 to-transparent shadow-lg shadow-amber-400/10"
                  : "border-slate-700",
                player.id === currentPlayerId && "ring-2 ring-sky-400",
                player.id === viewerPlayerId && "ring-2 ring-emerald-400",
              )}
              role="listitem"
            >
              <div className="flex items-center justify-center w-10 h-10 flex-shrink-0">
                {isTop3 ? (
                  rankIcons[rank as 1 | 2 | 3]
                ) : (
                  <span className="font-display font-bold text-slate-400 text-lg">#{rank}</span>
                )}
              </div>
              <Avatar avatarId={player.avatarId} size="md" ring />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{player.name}</span>
                  {player.id === viewerPlayerId && (
                    <span className="text-xs px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full">คุณ</span>
                  )}
                  {player.isHost && (
                    <span className="text-xs px-1.5 py-0.5 bg-violet-500/20 text-violet-300 rounded-full">โฮสต์</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                  {showPosition && <span>ตำแหน่ง: <span className="font-mono text-white">{player.position}</span></span>}
                  {showScore && <span>คะแนน: <span className="font-mono text-amber-400">{player.score}</span></span>}
                  {player.finishRank && (
                    <span className="text-emerald-400 font-medium">🏁 เข้าชัย #{player.finishRank}</span>
                  )}
                </div>
              </div>
              {showScore && (
                <div className="text-right">
                  <div className="font-display font-bold text-lg text-amber-400">{player.score}</div>
                  <div className="text-xs text-slate-500">pts</div>
                </div>
              )}
            </div>
          );
        })}
        {sortedPlayers.length > (maxVisible || 0) && (
          <div className="text-center text-slate-500 text-sm py-2">
            และอีก {sortedPlayers.length - (maxVisible || 0)} ผู้เล่น...
          </div>
        )}
      </div>
    );
  }

  // Full mode
  return (
    <div className={cn("space-y-2", className)} role="list" aria-label="รายชื่อผู้เล่น">
      {visiblePlayers.map((player, index) => (
        <div
          key={player.id}
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
            "bg-slate-800/50 border",
            player.id === currentPlayerId
              ? "border-sky-400/50 bg-sky-500/5 ring-1 ring-sky-400/20"
              : player.id === viewerPlayerId
              ? "border-emerald-400/50 bg-emerald-500/5 ring-1 ring-emerald-400/20"
              : "border-slate-700",
          )}
          role="listitem"
        >
          <div className="flex items-center justify-center w-8 h-8 flex-shrink-0 text-slate-400 font-mono text-sm">
            #{index + 1}
          </div>
          <Avatar avatarId={player.avatarId} size="sm" ring />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{player.name}</span>
              {player.id === viewerPlayerId && (
                <Badge variant="success" size="sm">คุณ</Badge>
              )}
              {player.isHost && <Badge variant="info" size="sm">โฮสต์</Badge>}
              {player.isBot && <Badge variant="default" size="sm">บอท</Badge>}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
              {showPosition && <span>ตำแหน่ง: <span className="font-mono text-white">{player.position}</span></span>}
              {showScore && <span>คะแนน: <span className="font-mono text-amber-400">{player.score}</span></span>}
              {player.lastRoll && <span>ทอย: <span className="font-mono text-sky-400">{player.lastRoll}</span></span>}
              {player.finishRank && <span className="text-emerald-400 font-medium">🏁 #{player.finishRank}</span>}
            </div>
          </div>
          {player.answerState !== "idle" && (
            <AnswerStateIndicator state={player.answerState} />
          )}
        </div>
      ))}
      {sortedPlayers.length > (maxVisible || 0) && (
        <div className="text-center text-slate-500 text-sm py-2 border-t border-slate-700">
          และอีก {sortedPlayers.length - (maxVisible || 0)} ผู้เล่น...
        </div>
      )}
    </div>
  );
}

interface AnswerStateIndicatorProps {
  state: "idle" | "selected" | "correct" | "wrong";
}

function AnswerStateIndicator({ state }: AnswerStateIndicatorProps) {
  const indicators = {
    selected: { icon: "⏳", color: "text-amber-400", label: "กำลังตอบ" },
    correct: { icon: "✅", color: "text-emerald-400", label: "ถูกต้อง" },
    wrong: { icon: "❌", color: "text-red-400", label: "ผิด" },
  };

  if (state === "idle") return null;
  const ind = indicators[state];
  return (
    <span className={cn("flex items-center gap-1 text-xs font-medium", ind.color)}>
      {ind.icon} {ind.label}
    </span>
  );
}

import { Badge } from "@/components/ui/Badge";