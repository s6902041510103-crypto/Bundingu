"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { TeacherLayoutShell } from "@/components/teacher/TeacherSidebar";
import { useTeacherAuth } from "@/lib/hooks/useTeacherAuth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Loading } from "@/components/ui/Loading";
import { QRCodeSVG } from "@/components/ui/QRCode";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { SUBJECTS, SNAKES, LADDERS } from "@/lib/game-data";
import type { GameHistoryRecord, Question, QuestionDifficulty } from "@/lib/types";
import {
  Check,
  Copy,
  Play,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Monitor,
  Users,
  Sparkles,
  Plus,
  CheckCircle2,
  RotateCcw,
  Trash2,
  BookOpen,
} from "lucide-react";

const STEPS = [
  { id: 1, label: "ตั้งค่าห้องเรียน" },
  { id: 2, label: "สร้าง/เลือกคำถาม" },
  { id: 3, label: "ตรวจสอบ" },
  { id: 4, label: "เริ่มเกม" },
];

function CreateGameContent() {
  const router = useRouter();
  const { teacher, loading: authLoading } = useTeacherAuth(true);
  const { toasts, addToast, removeToast } = useToast();
  const searchParams = useSearchParams();
  const templatePinParam = searchParams.get("templatePin") || "";

  const [step, setStep] = useState<number>(1);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<string>("คณิตศาสตร์");
  const [totalRounds, setTotalRounds] = useState<number>(15);
  const [questionTimeLimit, setQuestionTimeLimit] = useState<number>(30);
  const [targetGrade, setTargetGrade] = useState<number>(10);
  const [enableSpecials, setEnableSpecials] = useState<boolean>(true);

  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [savedGames, setSavedGames] = useState<GameHistoryRecord[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [activeTemplatePin, setActiveTemplatePin] = useState<string>("");

  // Inline Question Creator state (in Step 2)
  const [newPrompt, setNewPrompt] = useState("");
  const [newOptions, setNewOptions] = useState<[string, string, string, string]>([
    "",
    "",
    "",
    "",
  ]);
  const [newCorrectIndex, setNewCorrectIndex] = useState<number>(0);
  const [newDifficulty, setNewDifficulty] = useState<QuestionDifficulty>("medium");
  const [newExplanation, setNewExplanation] = useState("");
  const [questionFormError, setQuestionFormError] = useState("");
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  const [error, setError] = useState<string>("");
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createdPin, setCreatedPin] = useState<string | null>(null);
  const [busyPin, setBusyPin] = useState<string | null>(null);
  const [originUrl, setOriginUrl] = useState("");

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

  const applySavedGameTemplate = (game: GameHistoryRecord) => {
    setActiveTemplatePin(game.pin);
    setTitle(`${game.title} (ห้องใหม่)`);
    setSubject(game.subject || "คณิตศาสตร์");
    setTotalRounds(game.totalRounds || 5);
    setQuestionTimeLimit(game.questionTimeLimit || 30);
    setTargetGrade(game.targetGrade || 10);
    if (Array.isArray(game.enabledSpecials)) {
      setEnableSpecials(game.enabledSpecials.length > 0);
    }
    if (Array.isArray(game.questionIds) && game.questionIds.length > 0) {
      setSelectedQuestionIds(game.questionIds);
    }
    addToast({
      title: `โหลดชุดคำถามจาก "${game.title}" แล้ว`,
      description: "คุณสามารถปรับการตั้งค่าหรือกดเปิดใช้ห้องเดิมได้ทันที",
      variant: "success",
    });
  };

  const handleOpenSavedRoom = async (game: GameHistoryRecord) => {
    setBusyPin(game.pin);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (teacher?.teacherId) headers["x-teacher-id"] = teacher.teacherId;
      if (teacher?.email) headers["x-teacher-email"] = teacher.email;

      if ((game.status as string) === "completed" || (game.status as string) === "finished") {
        await fetch(`/api/games/${encodeURIComponent(game.pin)}/command`, {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify({ type: "RESET_ROOM" }),
        });
      }
      router.push(`/teacher/games/${game.pin}`);
    } catch {
      setBusyPin(null);
    }
  };

  const handleDeleteSavedRoom = async (game: GameHistoryRecord) => {
    setBusyPin(game.pin);
    try {
      const headers: Record<string, string> = {};
      if (teacher?.teacherId) headers["x-teacher-id"] = teacher.teacherId;
      if (teacher?.email) headers["x-teacher-email"] = teacher.email;
      const res = await fetch(`/api/games?pin=${encodeURIComponent(game.pin)}`, {
        method: "DELETE",
        credentials: "include",
        headers,
      });
      if (!res.ok) {
        setBusyPin(null);
        return;
      }
      setSavedGames((prev) => prev.filter((item) => item.pin !== game.pin && item.id !== game.id));
      if (activeTemplatePin === game.pin) {
        setActiveTemplatePin("");
      }
      addToast({
        title: `ลบห้องเกม "${game.title}" (${game.pin}) แล้ว`,
        variant: "info",
      });
    } catch {
      // ignore
    } finally {
      setBusyPin(null);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const headers: Record<string, string> = {};
        if (teacher?.teacherId) headers["x-teacher-id"] = teacher.teacherId;
        if (teacher?.email) headers["x-teacher-email"] = teacher.email;

        const [qRes, gRes] = await Promise.all([
          fetch("/api/questions", { cache: "no-store", headers, credentials: "include" }),
          fetch("/api/games", { cache: "no-store", headers, credentials: "include" }),
        ]);

        let loadedQuestions: Question[] = [];
        if (qRes.ok) {
          const qData = await qRes.json();
          if (Array.isArray(qData.questions)) {
            loadedQuestions = qData.questions;
            setAllQuestions(loadedQuestions);
            setSelectedQuestionIds(loadedQuestions.map((q) => q.id));
          }
        }

        if (gRes.ok) {
          const gData = await gRes.json();
          const hist: GameHistoryRecord[] = Array.isArray(gData.history)
            ? gData.history
            : [];
          setSavedGames(hist);

          if (templatePinParam) {
            const matched = hist.find(
              (h) => h.pin.toUpperCase() === templatePinParam.toUpperCase(),
            );
            if (matched) {
              setActiveTemplatePin(matched.pin);
              setTitle(`${matched.title} (ห้องใหม่)`);
              setSubject(matched.subject || "คณิตศาสตร์");
              setTotalRounds(matched.totalRounds || 5);
              setQuestionTimeLimit(matched.questionTimeLimit || 30);
              setTargetGrade(matched.targetGrade || 10);
              if (Array.isArray(matched.questionIds) && matched.questionIds.length > 0) {
                setSelectedQuestionIds(matched.questionIds);
              } else {
                const bySubj = loadedQuestions
                  .filter((q) => q.subject === matched.subject)
                  .map((q) => q.id);
                if (bySubj.length > 0) setSelectedQuestionIds(bySubj);
              }
            }
          }
        }
      } catch {
        // ignore
      }
    };
    loadInitialData();
  }, [templatePinParam, teacher?.teacherId, teacher?.email]);

  const filteredQuestions = useMemo(() => {
    if (subject === "ทั้งหมด") return allQuestions;
    const match = allQuestions.filter((q) => q.subject === subject);
    return match.length > 0 ? match : allQuestions;
  }, [allQuestions, subject]);

  const handleAddInlineQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuestionFormError("");

    if (!newPrompt.trim() || newPrompt.trim().length < 3) {
      setQuestionFormError("กรุณากรอกโจทย์คำถามอย่างน้อย 3 ตัวอักษร");
      return;
    }
    for (let i = 0; i < 4; i++) {
      if (!newOptions[i]?.trim()) {
        setQuestionFormError(
          `กรุณากรอกตัวเลือกข้อ ${String.fromCharCode(65 + i)} ให้ครบถ้วน`,
        );
        return;
      }
    }

    setIsSavingQuestion(true);
    try {
      const targetSubject = subject === "ทั้งหมด" ? "คณิตศาสตร์" : subject;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (teacher?.teacherId) headers["x-teacher-id"] = teacher.teacherId;
      if (teacher?.email) headers["x-teacher-email"] = teacher.email;

      const res = await fetch("/api/questions", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          prompt: newPrompt.trim(),
          subject: targetSubject,
          difficulty: newDifficulty,
          options: newOptions,
          correctIndex: newCorrectIndex,
          explanation: newExplanation.trim(),
          teacherId: teacher?.teacherId,
          teacherEmail: teacher?.email,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error || !data.question) {
        setQuestionFormError(data.error || "บันทึกคำถามไม่สำเร็จ");
        setIsSavingQuestion(false);
        return;
      }

      const createdQ: Question = data.question;
      setAllQuestions((prev) => [createdQ, ...prev]);
      setSelectedQuestionIds((prev) =>
        prev.includes(createdQ.id) ? prev : [...prev, createdQ.id],
      );

      // Reset inline question form for next question
      setNewPrompt("");
      setNewOptions(["", "", "", ""]);
      setNewCorrectIndex(0);
      setNewExplanation("");
      setError("");

      addToast({
        title: "เพิ่มคำถามเข้าชุดเกมเรียบร้อยแล้ว",
        description: createdQ.prompt,
        variant: "success",
      });
    } catch {
      setQuestionFormError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      const headers: Record<string, string> = {};
      if (teacher?.teacherId) headers["x-teacher-id"] = teacher.teacherId;
      if (teacher?.email) headers["x-teacher-email"] = teacher.email;

      const res = await fetch(`/api/questions/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
        headers,
      });
      if (!res.ok) return;
      setAllQuestions((prev) => prev.filter((q) => q.id !== id));
      setSelectedQuestionIds((prev) => prev.filter((qId) => qId !== id));
      addToast({
        title: "ลบคำถามออกจากคลังแล้ว",
        variant: "info",
      });
    } catch {
      // ignore
    }
  };

  const validateStep1 = (): string | null => {
    if (!title.trim() || title.trim().length < 2) {
      return "กรุณาตั้งชื่อเกม / ชื่อห้องเรียนอย่างน้อย 2 ตัวอักษร (เช่น คณิตศาสตร์ ม.1/1)";
    }
    if (!subject.trim()) {
      return "กรุณาเลือกรายวิชา";
    }
    if (!Number.isFinite(totalRounds) || totalRounds < 1 || totalRounds > 50) {
      return "จำนวนรอบต้องอยู่ระหว่าง 1 ถึง 50 รอบ";
    }
    if (
      !Number.isFinite(questionTimeLimit) ||
      questionTimeLimit < 5 ||
      questionTimeLimit > 120
    ) {
      return "เวลาตอบคำถามต้องอยู่ระหว่าง 5 ถึง 120 วินาที";
    }
    if (!Number.isFinite(targetGrade) || targetGrade < 1 || targetGrade > 1000) {
      return "คะแนนเก็บเต็มต้องอยู่ระหว่าง 1 ถึง 1,000 คะแนน";
    }
    return null;
  };

  const handleNextStep = () => {
    const validationError = validateStep1();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (step === 2 && selectedQuestionIds.length === 0) {
      setError("กรุณาสร้างคำถามใหม่ด้านล่าง หรือติ๊กเลือกคำถามอย่างน้อย 1 ข้อ");
      return;
    }
    setError("");
    setStep((prev) => Math.min(3, prev + 1));
  };

  const handleCreateGame = async () => {
    const validationError = validateStep1();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (selectedQuestionIds.length === 0) {
      setStep(2);
      setError("กรุณาสร้างคำถาม-คำตอบอย่างน้อย 1 ข้อก่อนเปิดห้องเกม");
      return;
    }

    setError("");
    setIsCreating(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (teacher?.teacherId) headers["x-teacher-id"] = teacher.teacherId;
      if (teacher?.email) headers["x-teacher-email"] = teacher.email;

      const res = await fetch("/api/games", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          title: title.trim(),
          subject,
          totalRounds,
          questionTimeLimit,
          targetGrade,
          maxPlayers: 40,
          questionIds: selectedQuestionIds,
          enabledSpecials: enableSpecials ? ["star", "gift", "boost"] : [],
          seedDemoPlayers: false,
          teacherId: teacher?.teacherId,
          teacherEmail: teacher?.email,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error || !data.pin) {
        setError(data.error || "ไม่สามารถสร้างห้องเกมได้");
        setIsCreating(false);
        return;
      }

      setCreatedPin(data.pin);
      addToast({
        title: "สร้างห้องเกมสำเร็จ! กำลังเข้าสู่หน้ารอนักเรียน...",
        description: `คีย์เข้าห้องคือ ${data.pin}`,
        variant: "success",
      });
      router.push(`/teacher/games/${data.pin}`);
    } catch {
      setError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyPin = () => {
    if (!createdPin) return;
    navigator.clipboard?.writeText(createdPin);
    addToast({
      title: `คัดลอกคีย์ ${createdPin} แล้ว`,
      variant: "info",
    });
  };

  if (authLoading) {
    return <Loading fullScreen label="กำลังเตรียมหน้าสร้างเกม..." />;
  }

  return (
    <TeacherLayoutShell
      teacher={teacher}
      title="สร้างห้องเกมใหม่"
      subtitle="กำหนดชื่อห้องเรียน รายวิชา คะแนนเก็บ และชุดคำถามเพื่อเปิดห้องแข่งขันทันที"
    >
      <div className="space-y-6">
        {/* Stepper Header — Sleek, clean progress bar */}
        <div className="rounded-3xl bg-white border border-slate-200/90 shadow-xs px-4 py-4 sm:px-8">
          <div className="grid grid-cols-4 gap-2 max-w-3xl mx-auto">
            {STEPS.map((s, idx) => {
              const isCompleted = step > s.id;
              const isCurrent = step === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    if (s.id < step) setStep(s.id);
                  }}
                  className="relative flex flex-col sm:flex-row items-center justify-center gap-2 py-1 cursor-pointer group"
                >
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center font-display font-bold text-sm transition-all shrink-0 ${
                      isCompleted
                        ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30"
                        : isCurrent
                        ? "bg-gradient-to-br from-[#2573ff] to-[#1554d1] text-white ring-4 ring-blue-100 shadow-md shadow-blue-600/25"
                        : "bg-slate-100 text-slate-400 border border-slate-200"
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  <div className="text-center sm:text-left min-w-0">
                    <span
                      className={`block text-xs sm:text-sm font-display truncate ${
                        isCurrent
                          ? "text-[#0f2547] font-bold"
                          : isCompleted
                          ? "text-emerald-700 font-semibold"
                          : "text-slate-400 font-medium"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Compact Quick-Template Bar (only if saved rooms exist) */}
        {step === 1 && savedGames.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-blue-50/70 border border-blue-200/80">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-display font-semibold text-[#0f2547]">
              <RotateCcw className="w-4 h-4 text-blue-600 shrink-0" />
              <span>ดึงตั้งค่าจากห้องเดิมที่เคยสร้าง:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {savedGames.slice(0, 4).map((g) => {
                const isSelected = activeTemplatePin === g.pin;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => applySavedGameTemplate(g)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-display font-semibold transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:border-blue-400"
                    }`}
                  >
                    {g.title} ({g.pin})
                  </button>
                );
              })}
              <Link
                href="/teacher/history"
                className="px-2.5 py-1.5 text-xs font-display font-bold text-blue-700 hover:underline"
              >
                ดูห้องทั้งหมด ({savedGames.length}) →
              </Link>
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-sm text-red-700"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1, 2, 3: Configuration + Settings Preview */}
        {step < 4 && (
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            {/* Left Form Column */}
            <Card variant="elevated" padding="lg" className="lg:col-span-8 space-y-6">
              {step === 1 && (
                <div className="space-y-6">
                  {/* Section 1: Room Name & Subject */}
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="game-title-input"
                          className="block font-display text-sm font-bold text-slate-800 mb-1.5"
                        >
                          ชื่อเกม / ห้องเรียน <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="game-title-input"
                          type="text"
                          value={title}
                          onChange={(e) => {
                            setTitle(e.target.value);
                            if (error) setError("");
                          }}
                          placeholder="เช่น คณิตศาสตร์ ม.1/1"
                          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50/70 text-slate-900 font-display font-semibold focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="subject-input"
                          className="block font-display text-sm font-bold text-slate-800 mb-1.5"
                        >
                          รายวิชา <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="subject-input"
                          type="text"
                          list="subject-suggestions"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="พิมพ์หรือเลือกรายวิชา..."
                          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50/70 text-slate-900 font-display font-semibold focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
                        />
                        <datalist id="subject-suggestions">
                          {SUBJECTS.map((subj) => (
                            <option key={subj} value={subj} />
                          ))}
                          <option value="ประวัติศาสตร์" />
                          <option value="สุขศึกษาและพลศึกษา" />
                          <option value="ศิลปะและดนตรี" />
                          <option value="วิทยาการคำนวณ" />
                        </datalist>
                      </div>
                    </div>

                    {/* Clean single-row subject quick chips */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-display font-semibold text-slate-400 mr-1">
                        วิชาแนะนำ:
                      </span>
                      {[
                        "คณิตศาสตร์",
                        "วิทยาศาสตร์",
                        "ภาษาไทย",
                        "ภาษาอังกฤษ",
                        "สังคมศึกษา",
                        "คอมพิวเตอร์",
                        "ประวัติศาสตร์",
                      ].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setSubject(tag)}
                          className={`px-3 py-1 rounded-full text-xs font-display font-semibold cursor-pointer transition-all ${
                            subject === tag
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Section 2: 3 Clean Visual Setting Cards (Target Grade, Total Rounds, Time Limit) */}
                  <div className="grid sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                    {/* Card 1: Target Grade */}
                    <div className="p-4 rounded-2xl bg-emerald-50/60 border-2 border-emerald-200/80 space-y-2.5">
                      <label
                        htmlFor="target-grade-input"
                        className="block font-display text-xs font-bold uppercase tracking-wide text-emerald-800"
                      >
                        🎯 คะแนนเก็บเต็ม (คะแนน) *
                      </label>
                      <input
                        id="target-grade-input"
                        type="number"
                        min={1}
                        max={1000}
                        value={targetGrade}
                        onChange={(e) => setTargetGrade(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border-2 border-emerald-300 bg-white text-emerald-950 font-display text-lg font-black focus:border-emerald-600 focus:outline-none"
                      />
                      <div className="flex flex-wrap gap-1">
                        {[5, 10, 15, 20, 100].map((pts) => (
                          <button
                            key={pts}
                            type="button"
                            onClick={() => setTargetGrade(pts)}
                            className={`px-2 py-1 rounded-lg font-display text-[11px] font-bold transition-colors cursor-pointer ${
                              targetGrade === pts
                                ? "bg-emerald-600 text-white"
                                : "bg-white/90 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                            }`}
                          >
                            {pts}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-emerald-800/80 leading-snug">
                        ตอบถูกครบทุกข้อได้เต็ม {targetGrade} คะแนน
                      </p>
                    </div>

                    {/* Card 2: Total Rounds */}
                    <div className="p-4 rounded-2xl bg-blue-50/60 border-2 border-blue-200/80 space-y-2.5">
                      <label
                        htmlFor="rounds-input"
                        className="block font-display text-xs font-bold uppercase tracking-wide text-blue-800"
                      >
                        🎲 จำนวนรอบคำถาม (รอบ) *
                      </label>
                      <input
                        id="rounds-input"
                        type="number"
                        min={1}
                        max={50}
                        value={totalRounds}
                        onChange={(e) => setTotalRounds(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border-2 border-blue-200 bg-white text-slate-900 font-display text-lg font-black focus:border-blue-600 focus:outline-none"
                      />
                      <div className="flex flex-wrap gap-1">
                        {[5, 10, 15, 20, 30].map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setTotalRounds(r)}
                            className={`px-2 py-1 rounded-lg font-display text-[11px] font-bold transition-colors cursor-pointer ${
                              totalRounds === r
                                ? "bg-blue-600 text-white"
                                : "bg-white/90 text-blue-800 border border-blue-200 hover:bg-blue-100"
                            }`}
                          >
                            {r} รอบ
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-blue-800/80 leading-snug">
                        หากคำถามน้อยกว่ารอบ ระบบวนซ้ำให้อัตโนมัติ
                      </p>
                    </div>

                    {/* Card 3: Question Time Limit */}
                    <div className="p-4 rounded-2xl bg-amber-50/60 border-2 border-amber-200/80 space-y-2.5">
                      <label
                        htmlFor="time-limit-input"
                        className="block font-display text-xs font-bold uppercase tracking-wide text-amber-900"
                      >
                        ⏱️ เวลาตอบต่อข้อ (วินาที) *
                      </label>
                      <input
                        id="time-limit-input"
                        type="number"
                        min={5}
                        max={120}
                        value={questionTimeLimit}
                        onChange={(e) => setQuestionTimeLimit(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border-2 border-amber-200 bg-white text-slate-900 font-display text-lg font-black focus:border-amber-500 focus:outline-none"
                      />
                      <div className="flex flex-wrap gap-1">
                        {[15, 20, 30, 45, 60].map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => setQuestionTimeLimit(sec)}
                            className={`px-2 py-1 rounded-lg font-display text-[11px] font-bold transition-colors cursor-pointer ${
                              questionTimeLimit === sec
                                ? "bg-amber-500 text-white"
                                : "bg-white/90 text-amber-900 border border-amber-200 hover:bg-amber-100"
                            }`}
                          >
                            {sec} วิ
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-amber-900/80 leading-snug">
                        ตอบไวรับโบนัสความเร็วสูงสุด +5 คะแนน
                      </p>
                    </div>
                  </div>

                  {/* Section 3: Special Cells Toggle */}
                  <label className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/90 cursor-pointer hover:bg-slate-100/70 transition-colors select-none">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={enableSpecials}
                        onChange={(e) => setEnableSpecials(e.target.checked)}
                        className="w-5 h-5 rounded-md border-slate-300 text-blue-600"
                      />
                      <div>
                        <span className="block font-display text-sm font-bold text-slate-800">
                          เปิดใช้งานช่องโบนัสพิเศษบนกระดาน 100 ช่อง
                        </span>
                        <span className="text-xs text-slate-500">
                          เพิ่มความตื่นเต้นด้วยช่อง 25 ⭐ โบนัส, ช่อง 50 🎁 กล่องปริศนา และช่อง 75 ✨ พุ่งทะยาน
                        </span>
                      </div>
                    </div>
                    <Badge variant={enableSpecials ? "success" : "default"} size="sm">
                      {enableSpecials ? "เปิดใช้งาน" : "ปิด"}
                    </Badge>
                  </label>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  {/* Inline Question Builder — Teacher creates their own questions & answers right here */}
                  <div className="p-5 rounded-2xl bg-blue-50/60 border-2 border-blue-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-display font-bold text-base text-[#0f2547] flex items-center gap-2">
                          <Plus className="w-5 h-5 text-blue-600" />
                          <span>สร้างคำถาม-คำตอบใหม่สำหรับเกมนี้</span>
                        </h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          พิมพ์โจทย์คำถาม ตัวเลือก 4 ข้อ และกดเลือกข้อที่ถูกต้อง ระบบจะบันทึกเข้าคลังและติ๊กเข้าเกมนี้ให้อัตโนมัติ
                        </p>
                      </div>
                      <Badge variant="primary" size="sm">
                        วิชา: {subject === "ทั้งหมด" ? "คณิตศาสตร์" : subject}
                      </Badge>
                    </div>

                    {questionFormError && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{questionFormError}</span>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <label className="block font-display text-xs font-bold text-slate-700 mb-1">
                          โจทย์คำถาม <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newPrompt}
                          onChange={(e) => setNewPrompt(e.target.value)}
                          placeholder="พิมพ์โจทย์คำถามที่นี่..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block font-display text-xs font-bold text-slate-700">
                          ตัวเลือก 4 ข้อ (คลิกปุ่มด้านหน้าข้อที่เป็นคำตอบที่ถูกต้อง){" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <div className="grid sm:grid-cols-2 gap-2.5">
                          {[0, 1, 2, 3].map((idx) => {
                            const letter = String.fromCharCode(65 + idx);
                            const isCorrect = newCorrectIndex === idx;
                            return (
                              <div
                                key={idx}
                                className={`flex items-center gap-2 p-2 rounded-xl border transition-colors ${
                                  isCorrect
                                    ? "bg-emerald-50/90 border-emerald-400"
                                    : "bg-white border-slate-200"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => setNewCorrectIndex(idx)}
                                  className={`px-2.5 py-1.5 rounded-lg font-display font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer transition-colors ${
                                    isCorrect
                                      ? "bg-emerald-600 text-white"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  }`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{letter} ถูก</span>
                                </button>
                                <input
                                  type="text"
                                  value={newOptions[idx]}
                                  onChange={(e) => {
                                    const next = [...newOptions] as [
                                      string,
                                      string,
                                      string,
                                      string,
                                    ];
                                    next[idx] = e.target.value;
                                    setNewOptions(next);
                                  }}
                                  placeholder={`คำตอบข้อ ${letter}`}
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-transparent text-sm text-slate-900 focus:outline-none"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-2.5 items-end pt-1">
                        <div className="sm:col-span-2">
                          <label className="block font-display text-xs font-bold text-slate-700 mb-1">
                            คำอธิบายเฉลย (ไม่บังคับ)
                          </label>
                          <input
                            type="text"
                            value={newExplanation}
                            onChange={(e) => setNewExplanation(e.target.value)}
                            placeholder="อธิบายสั้น ๆ แสดงให้นักเรียนเห็นหลังเฉลย"
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                          />
                        </div>

                        <Button
                          type="button"
                          variant="primary"
                          size="md"
                          loading={isSavingQuestion}
                          onClick={handleAddInlineQuestion}
                          iconLeft={<Plus className="w-4 h-4" />}
                          className="w-full"
                        >
                          บันทึกและเพิ่มเข้าเกมนี้
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* List of Teacher's Selected / Created Questions */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-display font-bold text-base text-[#0f2547]">
                          คำถามของคุณที่เลือกใช้ในเกมนี้ ({selectedQuestionIds.length} ข้อ)
                        </h3>
                        <p className="text-xs text-slate-500">
                          คลิกติ๊กถูกคำถามที่ต้องการใช้ในห้องเรียนนี้
                        </p>
                      </div>

                      {selectedQuestionIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setTotalRounds(selectedQuestionIds.length)}
                          className="text-xs font-display font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          ตั้งจำนวนรอบเกมเท่ากับจำนวนคำถาม ({selectedQuestionIds.length} รอบ)
                        </button>
                      )}
                    </div>

                    {allQuestions.length === 0 ? (
                      <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-2">
                        <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="font-display font-bold text-sm text-slate-700">
                          ยังไม่มีคำถามในคลังของคุณ
                        </p>
                        <p className="text-xs text-slate-500">
                          กรอกโจทย์และตัวเลือก 4 ข้อในกล่องสีฟ้าด้านบน แล้วกด &ldquo;บันทึกและเพิ่มเข้าเกมนี้&rdquo; ได้เลย
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                        {allQuestions.map((qItem, idx) => {
                          const checked = selectedQuestionIds.includes(qItem.id);
                          const correctOpt = qItem.options.find(
                            (o) => o.id === qItem.correctOptionId,
                          );
                          return (
                            <div
                              key={qItem.id}
                              className={`flex items-start justify-between gap-3 p-3.5 rounded-xl border transition-colors ${
                                checked
                                  ? "border-blue-300 bg-blue-50/40"
                                  : "border-slate-200 bg-slate-50/60"
                              }`}
                            >
                              <label className="flex items-start gap-3 flex-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedQuestionIds((prev) => [
                                        ...prev,
                                        qItem.id,
                                      ]);
                                    } else {
                                      setSelectedQuestionIds((prev) =>
                                        prev.filter((id) => id !== qItem.id),
                                      );
                                    }
                                  }}
                                  className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-display font-semibold text-sm text-slate-800">
                                    {idx + 1}. {qItem.prompt}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <Badge variant="primary" size="sm">
                                      {qItem.subject}
                                    </Badge>
                                    <span className="text-xs text-emerald-700 font-medium">
                                      ✓ เฉลย: {correctOpt?.text}
                                    </span>
                                  </div>
                                </div>
                              </label>

                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(qItem.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                title="ลบคำถามนี้"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="font-display font-bold text-lg text-[#0f2547]">
                    ยืนยันการตั้งค่าก่อนสร้างห้องเกม
                  </h3>
                  <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm">
                    <div>
                      <span className="text-slate-500 block text-xs">
                        ชื่อเกม / ห้องเรียน
                      </span>
                      <span className="font-display font-bold text-slate-900">
                        {title}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs">รายวิชา</span>
                      <span className="font-display font-bold text-slate-900">
                        {subject}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs">
                        คำถามที่ใช้ในห้องนี้
                      </span>
                      <span className="font-display font-bold text-emerald-700">
                        {selectedQuestionIds.length} ข้อ (บันทึกไว้ใช้ซ้ำกับห้องอื่นได้)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs">
                        จำนวนรอบ / เวลาตอบ
                      </span>
                      <span className="font-display font-bold text-blue-700">
                        {totalRounds} รอบ · {questionTimeLimit} วินาที/ข้อ
                      </span>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-slate-200">
                      <span className="text-slate-500 block text-xs">
                        คะแนนเก็บเต็ม (Target Grade)
                      </span>
                      <span className="font-display font-bold text-emerald-700">
                        เต็ม {targetGrade} คะแนน (ตอบถูกครบทุกข้อได้เต็ม {targetGrade} คะแนน)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="pt-3 flex items-center justify-between gap-3">
                {step > 1 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setStep((s) => s - 1)}
                    iconLeft={<ArrowLeft className="w-4 h-4" />}
                  >
                    ย้อนกลับ
                  </Button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2.5">
                  {step < 3 && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleNextStep}
                      iconRight={<ArrowRight className="w-4 h-4" />}
                    >
                      {step === 1 ? "ถัดไป: สร้าง/เลือกคำถาม" : "ถัดไป: ตรวจสอบ"}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    loading={isCreating}
                    onClick={handleCreateGame}
                    iconLeft={<Sparkles className="w-4 h-4" />}
                  >
                    {isCreating
                      ? "กำลังสร้างห้อง..."
                      : "สร้างห้องเกมและรับคีย์เข้าห้อง"}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Right Column: Clean Sticky Summary Ticket */}
            <Card
              variant="elevated"
              padding="lg"
              className="lg:col-span-4 lg:sticky lg:top-24 space-y-4 border-t-4 border-t-blue-600"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-extrabold text-[#0f2547]">
                  สรุปห้องเกมที่จะเปิด
                </h2>
                <Badge variant="primary" size="sm">
                  {subject}
                </Badge>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div>
                  <span className="text-[11px] font-display font-semibold text-slate-400 uppercase">
                    ชื่อห้องเรียน
                  </span>
                  <p className="font-display font-extrabold text-slate-900 text-base truncate">
                    {title || "ยังไม่ได้ระบุชื่อห้องเรียน"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-200/70">
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80">
                    <span className="block text-[11px] text-emerald-700 font-medium">
                      คะแนนเก็บเต็ม
                    </span>
                    <span className="font-display text-lg font-black text-emerald-800">
                      {targetGrade} คะแนน
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200/80">
                    <span className="block text-[11px] text-blue-700 font-medium">
                      คำถามที่เลือก
                    </span>
                    <span className="font-display text-lg font-black text-blue-800">
                      {selectedQuestionIds.length} ข้อ
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <span className="block text-[11px] text-slate-500 font-medium">
                      จำนวนรอบ
                    </span>
                    <span className="font-display text-sm font-bold text-slate-800">
                      {totalRounds} รอบ
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <span className="block text-[11px] text-slate-500 font-medium">
                      เวลาตอบ/ข้อ
                    </span>
                    <span className="font-display text-sm font-bold text-slate-800">
                      {questionTimeLimit} วินาที
                    </span>
                  </div>
                </div>
              </div>

              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                    ✓
                  </span>
                  <span>กระดาน 100 ช่อง · งู {SNAKES.length} ตัว · บันได {LADDERS.length} ตัว</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                    ✓
                  </span>
                  <span>บันทึกชุดเกมไว้เปิดซ้ำกับห้องเรียนถัดไปได้ทันที</span>
                </li>
              </ul>
            </Card>
          </div>
        )}

        {/* Step 4: Room Created — Show Real PIN & QR Code */}
        {step === 4 && createdPin && (
          <Card
            variant="elevated"
            padding="lg"
            className="max-w-2xl mx-auto text-center space-y-6"
          >
            <Badge variant="success" size="lg" className="mx-auto">
              ✓ สร้างห้องเกมสำเร็จ และบันทึกชุดคำถามไว้สำหรับห้องถัดไปแล้ว
            </Badge>

            <div>
              <h2 className="font-display text-2xl font-extrabold text-[#0f2547]">
                {title}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                รายวิชา: {subject} · คำถาม {selectedQuestionIds.length} ข้อ ·{" "}
                {totalRounds} รอบ · เวลาตอบ {questionTimeLimit} วินาที · เก็บ{" "}
                {targetGrade} คะแนน
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 p-6 rounded-3xl bg-blue-50/70 border border-blue-200">
              <div className="space-y-2">
                <span className="text-xs font-display font-bold uppercase tracking-wider text-blue-700">
                  คีย์ห้องเกม (Room Key)
                </span>
                <div className="font-display text-5xl font-black text-blue-800 tracking-widest">
                  {createdPin}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyPin}
                  iconLeft={<Copy className="w-4 h-4" />}
                >
                  คัดลอกคีย์ห้อง
                </Button>
              </div>

              <div className="flex flex-col items-center">
                <QRCodeSVG value={`${originUrl || ""}/join?pin=${createdPin}`} size={136} />
                <span className="text-xs text-slate-600 font-medium mt-2">
                  สแกน QR เพื่อเข้าห้อง {createdPin}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link href={`/teacher/games/${createdPin}`}>
                <Button
                  variant="primary"
                  size="lg"
                  iconLeft={<Play className="w-5 h-5" />}
                >
                  เปิดหน้าควบคุมเกมสด (Teacher Live Controller)
                </Button>
              </Link>
              <Link href={`/game/${createdPin}`}>
                <Button
                  variant="outline"
                  size="lg"
                  iconLeft={<Users className="w-5 h-5" />}
                >
                  เปิดหน้า Lobby นักเรียน
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </TeacherLayoutShell>
  );
}

export default function CreateGamePage() {
  return (
    <Suspense fallback={<Loading fullScreen label="กำลังเตรียมหน้าสร้างเกม..." />}>
      <CreateGameContent />
    </Suspense>
  );
}
