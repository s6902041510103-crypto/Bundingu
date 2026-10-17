"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { TeacherLayoutShell } from "@/components/teacher/TeacherSidebar";
import { useTeacherAuth } from "@/lib/hooks/useTeacherAuth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Loading } from "@/components/ui/Loading";
import { QRCodeSVG } from "@/components/ui/QRCode";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { QUESTION_SETS, SUBJECTS, SNAKES, LADDERS } from "@/lib/game-data";
import type { Question } from "@/lib/types";
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
} from "lucide-react";

const STEPS = [
  { id: 1, label: "ตั้งค่าพื้นฐาน" },
  { id: 2, label: "เลือกคำถาม" },
  { id: 3, label: "ตรวจสอบ" },
  { id: 4, label: "เริ่มเกม" },
];

export default function CreateGamePage() {
  const { teacher, loading: authLoading } = useTeacherAuth(true);
  const { toasts, addToast, removeToast } = useToast();

  const [step, setStep] = useState<number>(1);
  const [title, setTitle] = useState("Math Challenge");
  const [subject, setSubject] = useState<string>("คณิตศาสตร์");
  const [questionSetId, setQuestionSetId] = useState<string>("set-math");
  const [totalRounds, setTotalRounds] = useState<number>(5);
  const [questionTimeLimit, setQuestionTimeLimit] = useState<number>(30);
  const [enableSpecials, setEnableSpecials] = useState<boolean>(true);
  const [seedDemoPlayers, setSeedDemoPlayers] = useState<boolean>(false);

  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createdPin, setCreatedPin] = useState<string | null>(null);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const res = await fetch("/api/questions", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.questions)) {
          setAllQuestions(data.questions);
          setSelectedQuestionIds(data.questions.map((q: Question) => q.id));
        }
      } catch {
        // ignore
      }
    };
    loadQuestions();
  }, []);

  const filteredQuestions = useMemo(() => {
    if (subject === "ทั้งหมด") return allQuestions;
    const match = allQuestions.filter((q) => q.subject === subject);
    return match.length > 0 ? match : allQuestions;
  }, [allQuestions, subject]);

  const validateForm = (): string | null => {
    if (!title.trim() || title.trim().length < 2) {
      return "กรุณาตั้งชื่อเกมอย่างน้อย 2 ตัวอักษร";
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
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setStep((prev) => Math.min(3, prev + 1));
  };

  const handleCreateGame = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setIsCreating(true);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          subject,
          totalRounds,
          questionTimeLimit,
          maxPlayers: 40,
          questionIds:
            selectedQuestionIds.length > 0
              ? selectedQuestionIds
              : filteredQuestions.map((q) => q.id),
          enabledSpecials: enableSpecials ? ["star", "gift", "boost"] : [],
          seedDemoPlayers,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error || !data.pin) {
        setError(data.error || "ไม่สามารถสร้างห้องเกมได้");
        setIsCreating(false);
        return;
      }

      setCreatedPin(data.pin);
      setStep(4);
      addToast({
        title: "สร้างห้องเกมสำเร็จ!",
        description: `รหัส Game PIN คือ ${data.pin}`,
        variant: "success",
      });
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
      title: `คัดลอก PIN ${createdPin} แล้ว`,
      variant: "info",
    });
  };

  if (authLoading) {
    return <Loading fullScreen label="กำลังเตรียมหน้าสร้างเกม..." />;
  }

  return (
    <TeacherLayoutShell
      teacher={teacher}
      title="สร้างเกมใหม่"
      subtitle="กำหนดชื่อเกม รายวิชา ชุดคำถาม จำนวนรอบ และรับ Game PIN พร้อม QR Code"
    >
      <div className="space-y-6">
        {/* Stepper Header (Matches Reference Screen #4) */}
        <Card variant="default" padding="md">
          <div className="grid grid-cols-4 gap-2 max-w-2xl mx-auto">
            {STEPS.map((s) => {
              const isCompleted = step > s.id;
              const isCurrent = step === s.id;
              return (
                <div key={s.id} className="flex flex-col items-center text-center gap-1.5">
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
                </div>
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
            <Card variant="elevated" padding="lg" className="lg:col-span-7 space-y-5">
              {step === 1 && (
                <>
                  <div>
                    <label
                      htmlFor="game-title-input"
                      className="block font-display text-sm font-bold text-slate-700 mb-1.5"
                    >
                      ชื่อเกม <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="game-title-input"
                      type="text"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        if (error) setError("");
                      }}
                      placeholder="เช่น Math Challenge, วิทยาศาสตร์ ม.1"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50/70 text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="subject-select"
                        className="block font-display text-sm font-bold text-slate-700 mb-1.5"
                      >
                        เลือกรายวิชา <span className="text-red-500">*</span>
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
                        htmlFor="question-set-select"
                        className="block font-display text-sm font-bold text-slate-700 mb-1.5"
                      >
                        เลือกชุดคำถาม
                      </label>
                      <select
                        id="question-set-select"
                        value={questionSetId}
                        onChange={(e) => {
                          setQuestionSetId(e.target.value);
                          const found = QUESTION_SETS.find((s) => s.id === e.target.value);
                          if (found) setSubject(found.subject);
                        }}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50/70 text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                      >
                        {QUESTION_SETS.map((qSet) => (
                          <option key={qSet.id} value={qSet.id}>
                            {qSet.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="rounds-input"
                        className="block font-display text-sm font-bold text-slate-700 mb-1.5"
                      >
                        จำนวนรอบ <span className="text-red-500">*</span>
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
                        เวลาตอบ (วินาที) <span className="text-red-500">*</span>
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
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display font-bold text-lg text-[#0f2547]">
                        เลือกคำถามในชุด ({filteredQuestions.length} ข้อ)
                      </h3>
                      <p className="text-xs text-slate-500">
                        รายวิชา: {subject} · สามารถจัดการเพิ่มได้ที่หน้าคลังคำถาม
                      </p>
                    </div>
                    <Link
                      href="/teacher/questions"
                      className="text-xs font-display font-semibold text-blue-600 hover:underline"
                    >
                      + จัดการคลังคำถาม
                    </Link>
                  </div>

                  <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                    {filteredQuestions.map((qItem, idx) => {
                      const checked = selectedQuestionIds.includes(qItem.id);
                      return (
                        <label
                          key={qItem.id}
                          className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedQuestionIds((prev) => [...prev, qItem.id]);
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
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="primary" size="sm">
                                {qItem.subject}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                4 ตัวเลือก
                              </span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
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
                      <span className="text-slate-500 block text-xs">ชื่อเกม</span>
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
                      <span className="text-slate-500 block text-xs">จำนวนรอบ</span>
                      <span className="font-display font-bold text-blue-700">
                        {totalRounds} รอบ
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs">เวลาตอบต่อข้อ</span>
                      <span className="font-display font-bold text-blue-700">
                        {questionTimeLimit} วินาที
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
                      ถัดไป
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
                    {isCreating ? "กำลังสร้างห้อง..." : "สร้างห้องเกมและรับ PIN"}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Right Column: Settings Preview Card (Matches Reference Screen #4) */}
            <Card variant="soft" padding="lg" className="lg:col-span-5 space-y-4">
              <h2 className="font-display text-lg font-bold text-[#0f2547]">
                ตั้งค่าเกม (ตัวอย่างการตั้งค่า)
              </h2>

              <ul className="space-y-3 text-sm text-slate-700">
                <li className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                    ✓
                  </span>
                  <span>
                    กระดาน <strong>100 ช่อง</strong> (10×10 Boustrophedon)
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                    ✓
                  </span>
                  <div>
                    <span>
                      งู <strong>{SNAKES.length} ตัว</strong>
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {SNAKES.map((s) => `${s.from}→${s.to}`).join(", ")}
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                    ✓
                  </span>
                  <div>
                    <span>
                      บันได <strong>{LADDERS.length} ตัว</strong>
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {LADDERS.map((l) => `${l.from}→${l.to}`).join(", ")}
                    </p>
                  </div>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                    ✓
                  </span>
                  <span>
                    ช่องพิเศษ <strong>3 ช่อง</strong> (25 ⭐, 50 🎁, 75 ✨)
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                    ✓
                  </span>
                  <span>
                    ผู้เล่นสูงสุด <strong>~40 คน</strong>
                  </span>
                </li>
              </ul>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1.5 text-xs text-slate-600">
                <p className="font-display font-bold text-slate-800">สรุปค่าที่เลือก:</p>
                <p>ชื่อห้อง: {title || "-"}</p>
                <p>หมวดวิชา: {subject}</p>
                <p>
                  จำนวนรอบ: {totalRounds} รอบ · เวลาตอบ {questionTimeLimit} วินาที/ข้อ
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* Step 4: Room Created — Show Real PIN & QR Code */}
        {step === 4 && createdPin && (
          <Card variant="elevated" padding="lg" className="max-w-2xl mx-auto text-center space-y-6">
            <Badge variant="success" size="lg" className="mx-auto">
              ✓ สร้างห้องเกมสำเร็จ พร้อมให้นักเรียนเข้าร่วม
            </Badge>

            <div>
              <h2 className="font-display text-2xl font-extrabold text-[#0f2547]">
                {title}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                รายวิชา: {subject} · {totalRounds} รอบ · เวลาตอบ {questionTimeLimit} วินาที
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 p-6 rounded-3xl bg-blue-50/70 border border-blue-200">
              <div className="space-y-2">
                <span className="text-xs font-display font-bold uppercase tracking-wider text-blue-700">
                  Game PIN สำหรับเข้าร่วม
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
                  คัดลอก PIN
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
