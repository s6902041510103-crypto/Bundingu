"use client";

import React, { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { sounds } from "@/lib/audio";
import { cn } from "@/lib/utils";

interface SoundToggleProps {
  className?: string;
}

export function SoundToggle({ className }: SoundToggleProps) {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(sounds.isEnabled());
    const onToggle = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setEnabled(customEvent.detail);
    };
    window.addEventListener("ks_sound_toggle", onToggle);
    return () => window.removeEventListener("ks_sound_toggle", onToggle);
  }, []);

  const handleToggle = () => {
    const next = sounds.toggle();
    setEnabled(next);
    if (next) {
      sounds.playClick();
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={cn(
        "p-2 rounded-xl border transition-colors cursor-pointer flex items-center justify-center",
        enabled
          ? "bg-blue-600/25 border-blue-400/40 text-blue-200 hover:bg-blue-600/40 hover:text-white"
          : "bg-slate-800/60 border-white/10 text-slate-400 hover:bg-slate-800 hover:text-slate-200",
        className,
      )}
      title={enabled ? "ปิดเสียงเอฟเฟกต์" : "เปิดเสียงเอฟเฟกต์"}
      aria-label={enabled ? "ปิดเสียงเอฟเฟกต์" : "เปิดเสียงเอฟเฟกต์"}
    >
      {enabled ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />}
    </button>
  );
}
