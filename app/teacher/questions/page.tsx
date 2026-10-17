"use client";

import React, { useEffect, useState, useCallback } from "react";
import { TeacherLayoutShell } from "@/components/teacher/TeacherSidebar";
import { useTeacherAuth } from "@/lib/hooks/useTeacherAuth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Loading } from "@/components/ui/Loading";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { SUBJECTS } from "@/lib/game-data";
import type { Question, QuestionDifficulty } from "@/lib/types";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

const DIFFICULTY_LABELS: Record<QuestionDifficulty, { label: string; variant: "success" | "warning" | "danger" }> = {
  easy: { label: "ง่าย", variant: "success" },
  medium: { label: "ปานกลาง", variant: "warning" },
  hard: { label: "ยาก", variant: "danger" },
};

export default function QuestionBankPage() {
  const { teacher, loading: authLoading } = useTeacherAuth(true);
  const { toasts, addToast, removeToast } = useToast();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("ทั้งหมด");
  const [difficultyFilter, setDifficultyFilter] = useState("ทั้งหมด");

  // Modal state for Add / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [subject, setSubject] = useState<string>("คณิตศาสตร์");
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>("medium");
  const [options, setOptions] = useState<[string, string, string, string]>(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState<number>(0);
  const [explanation, setExplanation] = useState("");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchQuestions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (subjectFilter !== "ทั้งหมด") params.set("subject", subjectFilter);
      if (difficultyFilter !== "ทั้งหมด") params.set("difficulty", difficultyFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/questions?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setQuestions(Array.isArray(data.questions) ? data.questions : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [subjectFilter, difficultyFilter, search]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const openAddModal = () => {
    setEditingId(null);
    setPrompt("");
    setSubject("คณิตศาสตร์");
    setDifficulty("medium");
    setOptions(["", "", "", ""]);
    setCorrectIndex(0);
    setExplanation("");
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (q: Question) => {
    setEditingId(q.id);
    setPrompt(q.prompt);
    setSubject(q.subject);
    setDifficulty(q.difficulty ?? "medium");
    const opts: [string, string, string, string] = [
      q.options[0]?.text ?? "",
      q.options[1]?.text ?? "",
      q.options[2]?.text ?? "",
      q.options[3]?.text ?? "",
    ];
    setOptions(opts);
    const cIdx = Math.max(
      0,
      q.options.findIndex((o) => o.id === q.correctOptionId),
    );
    setCorrectIndex(cIdx);
    setExplanation(q.explanation || "");
    setFormError("");
    setModalOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!prompt.trim() || prompt.trim().length < 3) {
      setFormError("กรุณากรอกข้อความคำถามอย่างน้อย 3 ตัวอักษร");
      return;
    }
    for (let i = 0; i < 4; i++) {
      if (!options[i]?.trim()) {
        setFormError(`กรุณากรอกตัวเลือกข้อ ${String.fromCharCode(65 + i)} ให้ครบถ้วน`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const url = editingId ? `/api/questions/${encodeURIComponent(editingId)}` : "/api/questions";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          subject,
          difficulty,
          options,
          correctIndex,
          explanation: explanation.trim(),
        }),
      });
      const data = await res.json();

      // Strictly do not claim Save succeeded if server returned error
      if (!res.ok || data.error || !data.question) {
        setFormError(data.error || "บันทึกข้อมูลไม่สำเร็จ กรุณาตรวจสอบสิทธิ์หรือข้อมูลอีกครั้ง");
        setIsSaving(false);
        return;
      }

      setModalOpen(false);
      await fetchQuestions();
      addToast({
        title: editingId ? "บันทึกการแก้ไขคำถามสำเร็จ" : "เพิ่มคำถามใหม่ลงในคลังสำเร็จ",
        description: data.question.prompt,
        variant: "success",
      });
    } catch {
      setFormError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์เพื่อบันทึกข้อมูลได้");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuestion = async (q: Question) => {
    try {
      const res = await fetch(`/api/questions/${encodeURIComponent(q.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        addToast({
          title: "ไม่สามารถลบคำถามได้",
          description: data.error || "กรุณาลองใหม่อีกครั้ง",
          variant: "danger",
        });
        return;
      }
      await fetchQuestions();
      addToast({
        title: "ลบคำถามออกจากคลังเรียบร้อยแล้ว",
        variant: "info",
      });
    } catch {
      addToast({
        title: "เกิดข้อผิดพลาดในการเชื่อมต่อ",
        variant: "danger",
      });
    }
  };

  if (authLoading || loading) {
    return <Loading fullScreen label="กำลังโหลดคลังคำถาม..." />;
  }

  return (
    <TeacherLayoutShell
      teacher={teacher}
      title="คลังข้อสอบ / คลังคำถาม"
      subtitle="ค้นหา กรองตามรายวิชา เพิ่ม แก้ไข และลบคำถามในคลังจริง"
      actions={
        <Button
          variant="primary"
          size="md"
          onClick={openAddModal}
          iconLeft={<Plus className="w-4 h-4" />}
        >
          เพิ่มคำถาม
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Search & Filter Controls (Matches Reference Screen #5) */}
        <Card variant="default" padding="md">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
            <div className="sm:col-span-6 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาคำถาม..."
                aria-label="ค้นหาคำถาม"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-3">
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                aria-label="กรองตามหมวดหมู่วิชา"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-none"
              >
                <option value="ทั้งหมด">หมวดหมู่ทั้งหมด</option>
                {SUBJECTS.map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                aria-label="กรองตามระดับความยาก"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-none"
              >
                <option value="ทั้งหมด">ระดับความยากทั้งหมด</option>
                <option value="easy">ง่าย</option>
                <option value="medium">ปานกลาง</option>
                <option value="hard">ยาก</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Questions Table (Matches Reference Screen #5) */}
        <Card variant="default" padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-display font-semibold text-slate-500">
                  <th className="py-3.5 px-5">คำถาม</th>
                  <th className="py-3.5 px-4">หมวดหมู่</th>
                  <th className="py-3.5 px-4">ระดับ</th>
                  <th className="py-3.5 px-5 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {questions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-500">
                      ไม่พบคำถามที่ตรงกับเงื่อนไขการค้นหา
                    </td>
                  </tr>
                ) : (
                  questions.map((q) => {
                    const diff = DIFFICULTY_LABELS[q.difficulty ?? "medium"];
                    const correctOpt = q.options.find(
                      (o) => o.id === q.correctOptionId,
                    );
                    return (
                      <tr
                        key={q.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-4 px-5 max-w-xl">
                          <p className="font-display font-bold text-slate-900">
                            {q.prompt}
                          </p>
                          <p className="text-xs text-emerald-700 mt-1">
                            ✓ คำตอบที่ถูก: <strong>{correctOpt?.text}</strong>
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-medium text-slate-700">
                            {q.subject}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant={diff.variant} size="sm">
                            {diff.label}
                          </Badge>
                        </td>
                        <td className="py-4 px-5 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(q)}
                              className="p-2 rounded-xl border border-slate-200 hover:bg-blue-50 text-slate-700 hover:text-blue-700 cursor-pointer"
                              title="แก้ไขคำถาม"
                              aria-label={`แก้ไขคำถาม ${q.prompt}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(q)}
                              className="p-2 rounded-xl border border-slate-200 hover:bg-red-50 text-red-500 hover:text-red-700 cursor-pointer"
                              title="ลบคำถาม"
                              aria-label={`ลบคำถาม ${q.prompt}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Add / Edit Question Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "แก้ไขคำถาม" : "เพิ่มคำถามใหม่"}
        description="กรอกข้อความคำถาม ตัวเลือก 4 ข้อ เลือกข้อที่ถูกต้อง และคำอธิบายเพิ่มเติม"
        size="lg"
      >
        <form onSubmit={handleSaveQuestion} className="space-y-4">
          {formError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-sm text-red-700"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block font-display text-sm font-bold text-slate-700 mb-1">
              ข้อความคำถาม <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="เช่น ผลลัพธ์ของ 12 × 8 เท่ากับเท่าไร?"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-display text-sm font-bold text-slate-700 mb-1">
                หมวดหมู่วิชา <span className="text-red-500">*</span>
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                {SUBJECTS.map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-display text-sm font-bold text-slate-700 mb-1">
                ระดับความยาก
              </label>
              <select
                value={difficulty}
                onChange={(e) =>
                  setDifficulty(e.target.value as QuestionDifficulty)
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                <option value="easy">ง่าย</option>
                <option value="medium">ปานกลาง</option>
                <option value="hard">ยาก</option>
              </select>
            </div>
          </div>

          {/* 4 Options + Correct Option Radio */}
          <div className="space-y-2.5">
            <label className="block font-display text-sm font-bold text-slate-700">
              ตัวเลือก 4 ข้อ และเลือกคำตอบที่ถูกต้อง <span className="text-red-500">*</span>
            </label>
            {[0, 1, 2, 3].map((idx) => {
              const letter = String.fromCharCode(65 + idx);
              const isCorrect = correctIndex === idx;
              return (
                <div key={idx} className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCorrectIndex(idx)}
                    className={`px-3 py-2 rounded-xl font-display font-bold text-xs flex items-center gap-1 border shrink-0 cursor-pointer ${
                      isCorrect
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>ข้อ {letter} ถูก</span>
                  </button>
                  <input
                    type="text"
                    value={options[idx]}
                    onChange={(e) => {
                      const next = [...options] as [string, string, string, string];
                      next[idx] = e.target.value;
                      setOptions(next);
                    }}
                    placeholder={`ข้อความตัวเลือก ${letter}`}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              );
            })}
          </div>

          <div>
            <label className="block font-display text-sm font-bold text-slate-700 mb-1">
              คำอธิบายเฉลย (ถ้ามี)
            </label>
            <input
              type="text"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="อธิบายเหตุผลของคำตอบที่ถูกต้องเพื่อแสดงหลังเฉลย"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button type="submit" variant="primary" loading={isSaving}>
              {isSaving ? "กำลังบันทึก..." : "บันทึกคำถาม"}
            </Button>
          </div>
        </form>
      </Modal>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </TeacherLayoutShell>
  );
}
