"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { ActiveQuestion, QuestionOption } from "@/lib/types";
import { AlertCircle, CheckCircle, XCircle, Send } from "lucide-react";
import { sounds } from "@/lib/audio";
import { ConfettiCanvas } from "@/components/game/ConfettiEffect";

interface AnswerOptionProps {
  option: QuestionOption;
  index: number;
  isSelected: boolean;
  isCorrect?: boolean;
  isRevealed: boolean;
  disabled: boolean;
  onSelect: (optionId: string) => void;
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
  className,
}: AnswerOptionProps) {
  const isWrong = isRevealed && isSelected && !isCorrect;
  const isCorrectAnswer = isRevealed && Boolean(isCorrect);
  const isJustSelected = isSelected && !isRevealed;
  const letter = String.fromCharCode(65 + index);

  const getVariantClasses = () => {
    if (isCorrectAnswer) {
      return "bg-emerald-50 border-emerald-500 text-emerald-950 shadow-sm ring-2 ring-emerald-500/20";
    }
    if (isWrong) {
      return "bg-red-50 border-red-500 text-red-950 shadow-sm";
    }
    if (isJustSelected) {
      return "bg-blue-50 border-blue-600 text-blue-950 shadow-sm ring-2 ring-blue-500/25";
    }
    if (isRevealed && !isSelected) {
      return "bg-slate-50 border-slate-200 text-slate-400 opacity-75";
    }
    return "bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-slate-800";
  };

  return (
    <button
      type="button"
      onClick={() => !disabled && onSelect(option.id)}
      disabled={disabled}
      className={cn(
        "relative flex items-center justify-between w-full px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl border-2 transition-all duration-150 font-body text-left text-sm sm:text-base select-none cursor-pointer disabled:cursor-default",
        getVariantClasses(),
        className,
      )}
      aria-pressed={isSelected}
      aria-disabled={disabled}
    >
      <span className="flex items-center gap-3 min-w-0">
        <span
          className={cn(
            "flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 font-display font-bold rounded-full text-xs sm:text-sm shrink-0 transition-colors",
            isCorrectAnswer
              ? "bg-emerald-600 text-white"
              : isWrong
              ? "bg-red-600 text-white"
              : isJustSelected
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-700 border border-slate-300",
          )}
        >
          {letter}
        </span>
        <span className="font-medium leading-snug break-words">{option.text}</span>
      </span>

      {isRevealed && (
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {isCorrectAnswer && (
            <CheckCircle className="w-5 h-5 text-emerald-600" aria-label="ถูกต้อง" />
          )}
          {isWrong && <XCircle className="w-5 h-5 text-red-600" aria-label="ผิด" />}
        </div>
      )}
    </button>
  );
}

interface QuestionCardProps {
  question: ActiveQuestion | null;
  onAnswer?: (optionId: string) => void;
  viewerAnswerState?: "idle" | "selected" | "correct" | "wrong";
  viewerSelectedOptionId?: string | null;
  readOnly?: boolean;
  requireConfirmButton?: boolean;
  className?: string;
}

export function QuestionCard({
  question,
  onAnswer,
  viewerAnswerState = "idle",
  viewerSelectedOptionId,
  readOnly = false,
  requireConfirmButton = false,
  className,
}: QuestionCardProps) {
  const [draftOptionId, setDraftOptionId] = useState<string | null>(null);
  const prevRevealedRef = React.useRef(false);

  useEffect(() => {
    setDraftOptionId(null);
  }, [question?.id, question?.number]);

  const isSubmitted = viewerAnswerState !== "idle" || Boolean(viewerSelectedOptionId);
  const isRevealed =
    Boolean(question?.revealed) || Boolean(isSubmitted && question?.correctOptionId);
  const disabled = readOnly || isSubmitted || isRevealed;

  useEffect(() => {
    if (isRevealed && !prevRevealedRef.current && !readOnly) {
      if (viewerAnswerState === "correct") {
        sounds.playCorrect();
      } else if (viewerAnswerState === "wrong") {
        sounds.playWrong();
      }
    }
    prevRevealedRef.current = isRevealed;
  }, [isRevealed, viewerAnswerState, readOnly]);

  if (!question) {
    return (
      <div
        className={cn(
          "p-6 rounded-2xl bg-white border-2 border-blue-200 text-center shadow-lg space-y-2",
          className,
        )}
      >
        <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto text-2xl">
          ⏳
        </div>
        <p className="font-display font-extrabold text-lg text-[#0f2547]">
          รอครูผู้สอนกดปุ่ม &ldquo;เริ่มคำถาม&rdquo;
        </p>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          เมื่อครูกดปุ่ม <strong>เริ่มคำถามข้อแรก / ข้อถัดไป</strong> บนหน้าจอควบคุมของครู
          โจทย์และตัวเลือก A, B, C, D จะปรากฏขึ้นตรงนี้ทันที!
        </p>
      </div>
    );
  }

  const activeChoice = isSubmitted ? viewerSelectedOptionId : draftOptionId;

  const handleOptionClick = (optId: string) => {
    if (disabled) return;
    sounds.playClick();
    setDraftOptionId(optId);
    if (!requireConfirmButton) {
      onAnswer?.(optId);
    }
  };

  const handleConfirmSubmit = () => {
    if (!draftOptionId || disabled) return;
    sounds.playClick();
    onAnswer?.(draftOptionId);
  };

  return (
    <div
      className={cn(
        "p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 text-slate-900 shadow-lg space-y-3.5",
        className,
      )}
    >
      {/* Question Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-display font-bold text-blue-700 text-sm sm:text-base">
            คำถามข้อที่ {question.number}/{question.total}
          </span>
          {question.subject && (
            <Badge variant="primary" size="sm">
              {question.subject}
            </Badge>
          )}
        </div>
        {isRevealed ? (
          <Badge variant="success" size="sm">
            เฉลยแล้ว
          </Badge>
        ) : (
          <Badge
            variant={question.timeLeft <= 5 ? "danger" : "warning"}
            size="sm"
          >
            ⏱ {question.timeLeft} วินาที
          </Badge>
        )}
      </div>

      {/* Prompt */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
        <p className="font-display font-bold text-slate-900 text-base sm:text-lg leading-snug">
          {question.prompt}
        </p>
        {question.hint && (
          <p className="mt-1.5 text-xs text-slate-500 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>คำใบ้: {question.hint}</span>
          </p>
        )}
      </div>

      {/* 4 Options */}
      {!readOnly && !isRevealed && !isSubmitted && (
        <div className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-display font-bold text-blue-800 text-center">
          👇 คลิกเลือกคำตอบที่ถูกต้องด้านล่าง (A, B, C หรือ D)
        </div>
      )}
      <div className="space-y-2" role="group" aria-label="ตัวเลือกคำตอบ 4 ข้อ">
        {question.options.map((option, index) => (
          <AnswerOption
            key={option.id}
            option={option}
            index={index}
            isSelected={activeChoice === option.id}
            isCorrect={
              isRevealed &&
              Boolean(question.correctOptionId) &&
              option.id === question.correctOptionId
            }
            isRevealed={isRevealed}
            disabled={disabled}
            onSelect={handleOptionClick}
          />
        ))}
      </div>

      {/* Submit Button / Answer Status for Student */}
      {!readOnly && !isRevealed && (
        <div className="pt-1">
          {!isSubmitted ? (
            requireConfirmButton && (
              <Button
                type="button"
                variant="primary"
                size="md"
                fullWidth
                disabled={!draftOptionId}
                onClick={handleConfirmSubmit}
                iconLeft={<Send className="w-4 h-4" />}
              >
                ส่งคำตอบ
              </Button>
            )
          ) : (
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-center text-blue-800 text-sm font-display font-semibold">
              ✓ ส่งคำตอบเรียบร้อยแล้ว!
            </div>
          )}
        </div>
      )}

      {/* Post-Reveal Feedback & Explanation */}
      {isRevealed && (
        <div className="space-y-2 pt-1 animate-fade-in relative">
          {!readOnly && (
            <>
              {viewerAnswerState === "correct" && (
                <ConfettiCanvas active={true} count={65} />
              )}
              <div
                className={cn(
                  "p-3 rounded-2xl text-sm font-display font-bold text-center border shadow-sm transition-all",
                  viewerAnswerState === "correct"
                    ? "bg-gradient-to-r from-emerald-500/15 via-teal-500/20 to-emerald-500/15 border-emerald-500 text-emerald-900 ring-2 ring-emerald-400/30"
                    : viewerAnswerState === "wrong"
                    ? "bg-gradient-to-r from-rose-500/10 via-red-500/15 to-rose-500/10 border-rose-300 text-rose-900"
                    : "bg-slate-100 border-slate-200 text-slate-700",
                )}
              >
                {viewerAnswerState === "correct" ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl animate-bounce">🎉</span>
                    <div>
                      <div className="text-base font-black text-emerald-800">
                        ถูกต้อง! รับคะแนน <span className="text-emerald-600 font-black">+100</span>
                      </div>
                      <div className="text-xs text-emerald-700 font-semibold">
                        ได้รับสิทธิ์ทอยลูกเต๋าเพื่อเดินตัวละครแล้ว!
                      </div>
                    </div>
                  </div>
                ) : viewerAnswerState === "wrong" ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl">💪</span>
                    <div>
                      <div className="text-base font-black text-rose-800">ยังไม่ถูกต้องในข้อนี้</div>
                      <div className="text-xs text-rose-700 font-medium">
                        อย่าเพิ่งท้อนะ สะสมคะแนนและแก้มือในข้อถัดไป!
                      </div>
                    </div>
                  </div>
                ) : (
                  "⏰ หมดเวลาตอบสำหรับข้อนี้"
                )}
              </div>
            </>
          )}

          {question.explanation && (
            <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs sm:text-sm text-emerald-950">
              <span className="font-display font-bold text-emerald-800">คำอธิบาย: </span>
              {question.explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}