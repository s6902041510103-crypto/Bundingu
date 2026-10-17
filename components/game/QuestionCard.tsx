"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import type { ActiveQuestion, QuestionOption } from "@/lib/types";
import { AlertCircle, Clock, CheckCircle, XCircle } from "lucide-react";

interface AnswerOptionProps {
  option: QuestionOption;
  index: number;
  isSelected: boolean;
  isCorrect?: boolean;
  isRevealed: boolean;
  disabled: boolean;
  onSelect: (optionId: string) => void;
  keyboardShortcut?: string;
  className?: string;
}

export function AnswerOption({
  option,
  index,
  isSelected,
  isCorrect,
  isRevealed,
  disabled,
  onSelect,
  keyboardShortcut,
  className,
}: AnswerOptionProps) {
  const isWrong = isRevealed && isSelected && !isCorrect;
  const isCorrectAnswer = isRevealed && isCorrect;
  const isJustSelected = isSelected && !isRevealed;

  const baseStyles =
    "relative flex items-center justify-between w-full p-4 rounded-xl border-2 transition-all duration-200 " +
    "font-body text-base select-none";

  const getVariantClasses = () => {
    if (isCorrectAnswer) {
      return "bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-lg shadow-emerald-500/10";
    }
    if (isWrong) {
      return "bg-red-500/15 border-red-500/50 text-red-300 shadow-lg shadow-red-500/10";
    }
    if (isJustSelected) {
      return "bg-sky-500/15 border-sky-500/50 text-sky-300 shadow-lg shadow-sky-500/10";
    }
    if (isRevealed && !isSelected) {
      return "bg-slate-800/50 border-slate-700 text-slate-400 opacity-70";
    }
    return "bg-slate-800/50 border-slate-700 hover:border-sky-500/50 hover:bg-sky-500/5 text-slate-100";
  };

  return (
    <button
      type="button"
      onClick={() => !disabled && onSelect(option.id)}
      disabled={disabled}
      className={cn(baseStyles, getVariantClasses(), className)}
      aria-pressed={isSelected}
      aria-disabled={disabled}
      aria-label={`ตัวเลือก ${String.fromCharCode(65 + index)}: ${option.text}`}
    >
      <span className="flex items-center gap-3 min-w-0">
        <span
          className={cn(
            "flex items-center justify-center font-display font-bold rounded-full border-2 flex-shrink-0 transition-all duration-200",
            isCorrectAnswer
              ? "bg-emerald-500 border-emerald-500 text-white"
              : isWrong
              ? "bg-red-500 border-red-500 text-white"
              : isJustSelected
              ? "bg-sky-500 border-sky-500 text-white"
              : "bg-slate-700 border-slate-600 text-slate-300",
            keyboardShortcut && "w-10 h-10 text-lg",
            !keyboardShortcut && "w-8 h-8 text-sm",
          )}
        >
          {String.fromCharCode(65 + index)}
        </span>
        <span className="truncate pr-2">{option.text}</span>
      </span>

      {keyboardShortcut && !isRevealed && !disabled && (
        <kbd className="flex-shrink-0 ml-3 px-2 py-1 text-xs bg-slate-700 rounded text-slate-400 font-mono">
          {keyboardShortcut}
        </kbd>
      )}

      {isRevealed && (
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
          {isCorrectAnswer && (
            <CheckCircle className="w-5 h-5 text-emerald-400" aria-label="ถูกต้อง" />
          )}
          {isWrong && (
            <XCircle className="w-5 h-5 text-red-400" aria-label="ผิด" />
          )}
          {!isSelected && isCorrect && (
            <CheckCircle className="w-5 h-5 text-emerald-400/50" aria-label="คำตอบที่ถูกต้อง" />
          )}
        </div>
      )}

      {isJustSelected && !isRevealed && (
        <div className="absolute inset-0 rounded-xl bg-sky-500/10 animate-pulse-soft pointer-events-none" aria-hidden="true" />
      )}
    </button>
  );
}

interface QuestionCardProps {
  question: ActiveQuestion | null;
  onAnswer?: (optionId: string) => void;
  viewerAnswerState?: "idle" | "selected" | "correct" | "wrong";
  viewerSelectedOptionId?: string | null;
  showKeyboardShortcuts?: boolean;
  className?: string;
}

export function QuestionCard({
  question,
  onAnswer,
  viewerAnswerState = "idle",
  viewerSelectedOptionId,
  showKeyboardShortcuts = true,
  className,
}: QuestionCardProps) {
  const [timeLeft, setTimeLeft] = useState(question?.timeLeft ?? 0);
  const [progress, setProgress] = useState(1);

  useEffect(() => {
    if (!question) return;
    setTimeLeft(question.timeLeft);
    setProgress(question.timeLeft / question.timeLimit);
  }, [question]);

  useEffect(() => {
    if (!question || question.revealed || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const next = Math.max(0, prev - 1);
        setProgress(next / question.timeLimit);
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [question, timeLeft]);

  if (!question) {
    return (
      <div className={cn("p-6 rounded-2xl bg-slate-800/50 border border-slate-700 text-center", className)}>
        <div className="text-slate-400">รอคำถาม...</div>
      </div>
    );
  }

  const isAnswered = viewerAnswerState !== "idle";
  const isRevealed = question.revealed;
  const disabled = isAnswered || isRevealed;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Question Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge variant="gold" size="sm">
            ข้อ {question.number} / {question.total}
          </Badge>
          {question.subject && (
            <Badge variant="info" size="sm">
              {question.subject}
            </Badge>
          )}
        </div>
        <Countdown timeLeft={timeLeft} timeLimit={question.timeLimit} progress={progress} isRevealed={isRevealed} />
      </div>

      {/* Question Text */}
      <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700">
        <p className="font-display text-lg font-medium text-white leading-relaxed">{question.prompt}</p>
        {question.hint && (
          <p className="mt-2 text-sm text-slate-400 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            <span>คำใบ้: {question.hint}</span>
          </p>
        )}
      </div>

      {/* Options Grid */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
        role="group"
        aria-label="ตัวเลือกคำตอบ"
      >
        {question.options.map((option, index) => (
          <AnswerOption
            key={option.id}
            option={option}
            index={index}
            isSelected={viewerSelectedOptionId === option.id}
            isCorrect={option.id === question.correctOptionId}
            isRevealed={isRevealed}
            disabled={disabled}
            onSelect={onAnswer ?? (() => {})}
            keyboardShortcut={showKeyboardShortcuts ? String.fromCharCode(65 + index) : undefined}
          />
        ))}
      </div>

      {/* Explanation after reveal */}
      {isRevealed && question.explanation && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 animate-fade-in">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-emerald-300">คำอธิบาย</p>
              <p className="text-sm text-slate-300 mt-1">{question.explanation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface CountdownProps {
  timeLeft: number;
  timeLimit: number;
  progress: number;
  isRevealed: boolean;
}

function Countdown({ timeLeft, timeLimit, progress, isRevealed }: CountdownProps) {
  const isWarning = timeLeft <= 5 && timeLeft > 0 && !isRevealed;
  const isCritical = timeLeft <= 3 && timeLeft > 0 && !isRevealed;

  return (
    <div className="flex items-center gap-3 flex-shrink-0" role="timer" aria-live={isWarning ? "assertive" : "polite"}>
      <div className="relative w-12 h-12 flex-shrink-0">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-slate-700"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={283}
            strokeDashoffset={283 * (1 - progress)}
            className={cn(
              "transition-all duration-300",
              isCritical ? "text-red-500" : isWarning ? "text-amber-500" : "text-sky-500",
            )}
            style={{ filter: isCritical ? "drop-shadow(0 0 4px currentColor)" : "none" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn(
              "font-display font-bold tabular-nums transition-colors duration-200",
              isCritical ? "text-red-400 animate-pulse-soft" : isWarning ? "text-amber-400" : "text-white",
            )}
          >
            {timeLeft}
          </span>
        </div>
      </div>
      <div className="hidden sm:block text-right">
        <div className="text-xs text-slate-500 font-mono">
          {timeLeft}s / {timeLimit}s
        </div>
        <div
          className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden mt-1"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300 ease-out",
              isCritical ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-sky-500",
            )}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}