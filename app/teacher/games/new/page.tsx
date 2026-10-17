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
  const [totalRounds, setTotalRounds] = useState<number>(5);
  const [questionTimeLimit, setQuestionTimeLimit] = useState<number>(30);
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

  const applySavedGameTemplate = (game: GameHistoryRecord) => {
    setActiveTemplatePin(game.pin);
    setTitle(`${game.title} (ห้องใหม่)`);
    setSubject(game.subject || "คณิตศาสตร์");
    setTotalRounds(game.totalRounds || 5);
    setQuestionTimeLimit(game.questionTimeLimit || 30);
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
      if (game.status === "completed") {
        await fetch(`/api/games/${encodeURIComponent(game.pin)}/command`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
      const res = await fetch(`/api/games?pin=${encodeURIComponent(game.pin)}`, {
        method: "DELETE",
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
    if (!Number.isFinite(totalRounds) || totalRounds < 1 || totalRounds > 30) {
      return "จำนวนรอบต้องอยู่ระหว่าง 1 ถึง 30 รอบ";
    }
    if (
      !Number.isFinite(questionTimeLimit) ||
      questionTimeLimit < 5 ||
      questionTimeLimit > 120
    ) {
      return "เวลาตอบคำถามต้องอยู่ระหว่าง 5 ถึง 120 วินาที";
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
      title="สร้างห้องเกมใหม่ / จัดการห้องที่สร้างไว้"
      subtitle="สร้างห้องเกมเก็บไว้เปิดใช้ได้ตลอดเวลาเมื่อสอนนักเรียนห้องถัดไป หรือลบห้องที่ไม่ต้องการได้"
    >
      <div className="space-y-6">
        {/* Saved Rooms Banner — Open saved room directly or delete */}
        {step < 4 && savedGames.length > 0 && (
          <Card
            variant="default"
            padding="md"
            className="border-2 border-blue-200 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-white"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-sm sm:text-base text-[#0f2547]">
                    ห้องเกมที่คุณสร้างเก็บไว้ (กดเปิดใช้งานได้ตลอดเวลา)
                  </h2>
                  <p className="text-xs text-slate-600">
                    กด <strong>&ldquo;เปิดใช้ห้องนี้&rdquo;</strong> เพื่อเข้าห้องเดิมทันที หรือกดปุ่มถังขยะเพื่อลบห้องที่ไม่ใช้แล้ว
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {savedGames.map((g) => {
                const isSelected = activeTemplatePin === g.pin;
                const isBusy = busyPin === g.pin;
                const qCount =
                  g.questionIds?.length ??
                  allQuestions.filter((q) => q.subject === g.subject).length;
                return (
                  <div
                    key={g.id}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-blue-50 border-blue-500 shadow-xs"
                        : "bg-white border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => applySavedGameTemplate(g)}
                      className="text-left min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="font-display font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {g.title}{" "}
                        <span className="font-mono text-xs text-blue-700">
                          (PIN: {g.pin})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {g.subject} · {qCount} คำถาม · {g.totalRounds} รอบ
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        loading={isBusy}
                        onClick={() => handleOpenSavedRoom(g)}
                        iconLeft={<Play className="w-3.5 h-3.5" />}
                      >
                        เปิดใช้ห้องนี้
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => handleDeleteSavedRoom(g)}
                        aria-label={`ลบห้อง ${g.title}`}
                        iconLeft={<Trash2 className="w-3.5 h-3.5" />}
                      >
                        ลบ
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Stepper Header */}
        <Card variant="default" padding="md">
          <div className="grid grid-cols-4 gap-2 max-w-2xl mx-auto">
            {STEPS.map((s) => {
              const isCompleted = step > s.id;
              const isCurrent = step === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    if (s.id < step) setStep(s.id);
                  }}
                  className="flex flex-col items-center text-center gap-1.5 cursor-pointer"
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-sm transition-colors ${
                      isCompleted
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                        ? "bg-[#1d63ec] text-white ring-4 ring-blue-100"
                        : "bg-slate-100 text-slate-400 border border-slate-200"
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : s.id}
                  </div>
                  <span
                    className={`text-xs font-display ${
                      isCurrent
                        ? "text-[#1d63ec] font-bold"
                        : isCompleted
                        ? "text-emerald-700 font-semibold"
                        : "text-slate-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

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
            <Card variant="elevated" padding="lg" className="lg:col-span-8 space-y-5">
              {step === 1 && (
                <>
                  <div>
                    <label
                      htmlFor="game-title-input"
                      className="block font-display text-sm font-bold text-slate-700 mb-1.5"
                    >
                      ชื่อเกม / ชื่อห้องเรียน <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="game-title-input"
                      type="text"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        if (error) setError("");
                      }}
                      placeholder="เช่น คณิตศาสตร์ ม.1/1, วิทยาศาสตร์ ม.2 ห้อง A"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50/70 text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      แนะนำให้ระบุห้องเรียนด้วย เช่น &ldquo;เรื่องเศษส่วน ม.1/1&rdquo; เมื่อเด็กเปลี่ยนห้องเป็น ม.1/2 จะได้กดเปิดห้องใหม่จากชุดเดิมได้สะดวก
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label
                        htmlFor="subject-select"
                        className="block font-display text-sm font-bold text-slate-700 mb-1.5"
                      >
                        รายวิชา <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="subject-select"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50/70 text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                      >
                        {SUBJECTS.map((subj) => (
                          <option key={subj} value={subj}>
                            {subj}
                          </option>
                        ))}
                        <option value="ทั้งหมด">รวมทุกวิชา</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="rounds-input"
                        className="block font-display text-sm font-bold text-slate-700 mb-1.5"
                      >
                        จำนวนรอบคำถาม <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="rounds-input"
                        type="number"
                        min={1}
                        max={30}
                        value={totalRounds}
                        onChange={(e) => setTotalRounds(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50/70 text-slate-900 font-display font-bold focus:bg-white focus:border-blue-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="time-limit-input"
                        className="block font-display text-sm font-bold text-slate-700 mb-1.5"
                      >
                        เวลาตอบต่อข้อ (วินาที) <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="time-limit-input"
                        type="number"
                        min={5}
                        max={120}
                        value={questionTimeLimit}
                        onChange={(e) => setQuestionTimeLimit(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50/70 text-slate-900 font-display font-bold focus:bg-white focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2 space-y-2.5 border-t border-slate-100">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={enableSpecials}
                        onChange={(e) => setEnableSpecials(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600"
                      />
                      <span className="text-sm font-medium text-slate-700">
                        เปิดใช้งานช่องพิเศษ 3 ช่อง (25 ⭐ BONUS, 50 🎁 GIFT, 75 ✨ BOOST)
                      </span>
                    </label>
                  </div>
                </>
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

            {/* Right Column: Settings Preview Card */}
            <Card variant="soft" padding="lg" className="lg:col-span-4 space-y-4">
              <h2 className="font-display text-lg font-bold text-[#0f2547]">
                สรุปชุดเกมที่จะบันทึก
              </h2>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 text-xs text-slate-600">
                <p className="font-display font-bold text-slate-800 text-sm">
                  {title || "ยังไม่ได้ระบุชื่อห้องเรียน"}
                </p>
                <p>หมวดวิชา: <strong>{subject}</strong></p>
                <p>
                  คำถามที่เลือกไว้:{" "}
                  <strong className="text-emerald-700">
                    {selectedQuestionIds.length} ข้อ
                  </strong>
                </p>
                <p>
                  จำนวนรอบ: <strong>{totalRounds} รอบ</strong> · เวลาตอบ{" "}
                  <strong>{questionTimeLimit} วินาที/ข้อ</strong>
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <p className="font-display font-bold">
                  💡 รองรับการสอนหลายห้องเรียน
                </p>
                <p>
                  เมื่อกดสร้างห้องแล้ว ระบบจะเก็บชุดเกมและคำถามชุดนี้ไว้ในบัญชีของคุณ เมื่อนักเรียนเปลี่ยนห้อง สามารถกดปุ่ม{" "}
                  <strong>&ldquo;เปิดห้องใหม่ (เปลี่ยนห้องเรียน)&rdquo;</strong>{" "}
                  ที่หน้าหลักเพื่อรับคีย์ห้องใหม่ได้ทันทีโดยไม่ต้องพิมพ์คำถามใหม่
                </p>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-600 pt-1">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    ✓
                  </span>
                  <span>กระดาน 100 ช่อง · งู {SNAKES.length} ตัว · บันได {LADDERS.length} ตัว</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    ✓
                  </span>
                  <span>คีย์ห้อง 6 หลัก (ตัวอักษรผสมตัวเลข) + QR Code</span>
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
                {totalRounds} รอบ · เวลาตอบ {questionTimeLimit} วินาที
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
                <QRCodeSVG value={`/join?pin=${createdPin}`} size={136} />
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
              <Link href={`/game/${createdPin}/projector`}>
                <Button
                  variant="secondary"
                  size="lg"
                  iconLeft={<Monitor className="w-5 h-5" />}
                >
                  เปิด Projector View
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
